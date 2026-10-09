import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import {
  badRequest,
  csrfOriginRejected,
  invalidFacilityTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { updateFacilityOperationalStatusService } from "@/lib/services/facility-status-service";
import { parseFacilityId } from "@/lib/validation/facility-query";
import { parseFacilityStatusBody } from "@/lib/validation/facility-status";

/**
 * PATCH /api/staff/facilities/{facilityId}/status (REP-04/RES-09).
 *
 * Petugas atau admin dengan akun ACTIVE mengubah status operasional
 * ACTIVE <-> UNDER_MAINTENANCE. Perubahan status dan seluruh efek maintenance
 * tersimpan dalam satu transaksi lewat emitter `facility.status.changed`.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/staff/facilities/[facilityId]/status">,
) {
  const instance = new URL(request.url).pathname;
  const { facilityId } = await ctx.params;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const originResult = validateOrigin(request, getAllowedOrigins());
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const parsedId = parseFacilityId(facilityId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }
  const SCOPE = buildIdempotencyScope("PATCH", `/api/staff/facilities/${parsedId.value}/status`);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // Klaim idempotency sebelum operasi bisnis: duplikat bersamaan menunggu dan
  // me-replay hasil pertama, bukan menjalankan transisi dua kali.
  const idempotency = await claimIdempotentRoute({
    key: idempotencyKey,
    principalId: session.id,
    scope: SCOPE,
    requestHash,
    instance,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseFacilityStatusBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let serviceResult: Awaited<ReturnType<typeof updateFacilityOperationalStatusService>>;
  try {
    serviceResult = await updateFacilityOperationalStatusService(
      session.id,
      parsedId.value,
      parsed.value.status,
      new Date(),
      async (tx, result) => {
        await idempotency.commit(tx, 200, result);
      },
    );
  } catch (e) {
    console.error("Gagal mengubah status fasilitas", e);
    return idempotency.fail();
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "not_found") {
      return idempotency.settle(notFound(instance, err.message));
    }
    if (err.type === "transition") {
      return idempotency.settle(invalidFacilityTransition(instance, err.message));
    }
    return idempotency.fail();
  }

  revalidateFacilityViews(parsedId.value);
  return NextResponse.json(serviceResult.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
