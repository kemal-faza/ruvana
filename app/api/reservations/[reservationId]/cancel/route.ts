import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import {
  badRequest,
  csrfOriginRejected,
  forbidden,
  internalError,
  invalidReservationTransition,
  notFound,
  unauthorized,
  validationFailed,
} from "@/lib/http/problem";
import { cancelMyReservationService } from "@/lib/services/reservation-service";
import { parseCancelBody } from "@/lib/validation/reservation";
import { parseReservationId } from "@/lib/validation/reservation-query";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/reservations/[reservationId]/cancel">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  if (!user) {
    return unauthorized(instance);
  }

  if (user.role !== Role.pengguna) {
    return forbidden(instance);
  }

  // Origin dicek setelah auth & authorization, sebelum idempotency (urutan kontrak OpenAPI).
  const allowedOrigins = getAllowedOrigins();
  const originResult = validateOrigin(request, allowedOrigins);
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  // Id path divalidasi dulu karena scope idempotency mengikat id.
  const parsedId = parseReservationId(reservationId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }
  const SCOPE = buildIdempotencyScope("POST", `/api/reservations/${parsedId.value}/cancel`);

  // Body di-parse dulu karena hash-nya bagian dari identity idempotency.
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
    principalId: user.id,
    scope: SCOPE,
    requestHash,
    instance,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseCancelBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let serviceResult: Awaited<ReturnType<typeof cancelMyReservationService>>;
  try {
    serviceResult = await cancelMyReservationService(
      user.id,
      parsedId.value,
      parsed.value,
      new Date(),
      async (tx, result) => {
        await idempotency.commit(tx, 200, result);
      },
    );
  } catch (e) {
    console.error("Gagal membatalkan reservasi", e);
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
