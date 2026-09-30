import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { RETENSI_IDEMPOTENCY_JAM } from "@/config/business";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import {
  badRequest,
  csrfOriginRejected,
  idempotencyConflict,
  internalError,
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

  const rawKey = request.headers.get("Idempotency-Key");
  if (!isValidIdempotencyKey(rawKey)) {
    return badRequest(instance, "Header Idempotency-Key wajib berupa UUID yang valid");
  }
  const idempotencyKey = rawKey!.trim();

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
  const idempotencyIdentity = {
    key: idempotencyKey,
    principalId: session.id,
    scope: SCOPE,
    requestHash,
    expiresAt: new Date(Date.now() + RETENSI_IDEMPOTENCY_JAM * 60 * 60 * 1000),
  };
  try {
    const claim = await claimOrGetIdempotencyKey(idempotencyIdentity);
    if (!claim.claimed) {
      if (claim.record.requestHash !== requestHash) {
        return idempotencyConflict(instance);
      }
      if (isIdempotencySettled(claim.record)) {
        return NextResponse.json(claim.record.responseBody as object, {
          status: claim.record.responseStatus ?? 500,
          headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
        });
      }
      const settled = await waitForIdempotencyResult({
        key: idempotencyKey,
        principalId: session.id,
        scope: SCOPE,
      });
      if (settled) {
        if (settled.requestHash !== requestHash) {
          return idempotencyConflict(instance);
        }
        return NextResponse.json(settled.responseBody as object, {
          status: settled.responseStatus ?? 500,
          headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
        });
      }
      return idempotencyConflict(instance, "Permintaan dengan key yang sama sedang diproses, silakan ulangi.");
    }
  } catch (e) {
    console.error("Gagal klaim idempotency", e);
    return internalError(instance);
  }

  const parsed = parseFacilityStatusBody(rawBody);
  if (!parsed.ok) {
    const body = {
      type: "https://ruvana.invalid/problems/validation-failed",
      title: "Validasi gagal",
      status: 422,
      detail: "Satu atau lebih field tidak memenuhi aturan validasi",
      instance,
      code: "VALIDATION_FAILED",
      errors: parsed.errors,
    };
    try {
      await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 422, responseBody: body });
    } catch {
      // Penyimpanan replay best-effort; respons tetap dikembalikan
    }
    return validationFailed(instance, parsed.errors);
  }

  let serviceResult: Awaited<ReturnType<typeof updateFacilityOperationalStatusService>>;
  try {
    serviceResult = await updateFacilityOperationalStatusService(
      session.id,
      parsedId.value,
      parsed.value.status,
      new Date(),
      async (tx, result) => {
        const stored = await storeIdempotencyResult(
          idempotencyIdentity,
          { responseStatus: 200, responseBody: result },
          tx,
        );
        if (stored.count !== 1) throw new Error("Klaim idempotency tidak dapat diselesaikan");
      },
    );
  } catch (e) {
    console.error("Gagal mengubah status fasilitas", e);
    try {
      await deleteIdempotencyClaim(idempotencyIdentity);
    } catch {}
    return internalError(instance);
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "not_found") {
      const body = {
        type: "https://ruvana.invalid/problems/not-found",
        title: "Resource tidak ditemukan",
        status: 404,
        detail: err.message,
        instance,
        code: "NOT_FOUND",
      };
      try {
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 404, responseBody: body });
      } catch {}
      return notFound(instance, err.message);
    }
    if (err.type === "transition") {
      const body = {
        type: "https://ruvana.invalid/problems/invalid-facility-transition",
        title: "Transisi fasilitas tidak valid",
        status: 409,
        detail: err.message,
        instance,
        code: "INVALID_FACILITY_TRANSITION",
      };
      try {
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 409, responseBody: body });
      } catch {}
      return invalidFacilityTransition(instance, err.message);
    }
    try {
      await deleteIdempotencyClaim(idempotencyIdentity);
    } catch {}
    return internalError(instance);
  }

  revalidateFacilityViews(parsedId.value);
  return NextResponse.json(serviceResult.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
