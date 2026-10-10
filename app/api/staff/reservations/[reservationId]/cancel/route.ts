import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import {
  badRequest,
  csrfOriginRejected,
  invalidReservationTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { cancelReservationByOfficerService } from "@/lib/services/reservation-service";
import { parseCancelBody } from "@/lib/validation/reservation";
import { parseReservationId } from "@/lib/validation/reservation-query";

import { guardStaff } from "../../guard";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reservations/[reservationId]/cancel">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const originResult = validateOrigin(request, getAllowedOrigins());
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const parsedId = parseReservationId(reservationId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }
  const SCOPE = buildIdempotencyScope("POST", `/api/staff/reservations/${parsedId.value}/cancel`);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // Klaim idempotency sebelum operasi bisnis: duplikat bersamaan menunggu
  // lalu me-replay hasil pertama, bukan membatalkan dua kali.
  const idempotency = await claimIdempotentRoute({
    key: idempotencyKey,
    principalId: session.id,
    scope: SCOPE,
    requestHash,
    instance,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseCancelBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let serviceResult: Awaited<ReturnType<typeof cancelReservationByOfficerService>>;
  try {
    serviceResult = await cancelReservationByOfficerService(
      session.id,
      parsedId.value,
      parsed.value,
      new Date(),
      async (tx, result) => {
        await idempotency.commit(tx, 200, result);
      },
    );
  } catch (e) {
    console.error("Gagal membatalkan reservasi oleh petugas", e);
    return idempotency.fail();
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "not_found") {
      return idempotency.settle(notFound(instance, err.message));
    }
    if (err.type === "transition") {
      return idempotency.settle(invalidReservationTransition(instance, err.message));
    }
    return idempotency.fail();
  }

  const successBody = serviceResult.data;
  return NextResponse.json(successBody, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
