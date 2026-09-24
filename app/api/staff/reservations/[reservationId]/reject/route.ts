import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import {
  badRequest,
  csrfOriginRejected,
  idempotencyConflict,
  internalError,
  invalidReservationTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { rejectReservationService } from "@/lib/services/reservation-service";
import { parseCancelBody } from "@/lib/validation/reservation";
import { parseReservationId } from "@/lib/validation/reservation-query";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";

import { guardStaff } from "../../guard";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reservations/[reservationId]/reject">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

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

  const parsedId = parseReservationId(reservationId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }
  const SCOPE = buildIdempotencyScope("POST", `/api/staff/reservations/${parsedId.value}/reject`);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // Klaim idempotency sebelum operasi bisnis: duplikat bersamaan menunggu
  // lalu me-replay hasil pertama, bukan menolak dua kali.
  const idempotencyIdentity = {
    key: idempotencyKey,
    principalId: session.id,
    scope: SCOPE,
    requestHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

  const parsed = parseCancelBody(rawBody);
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

  let serviceResult: Awaited<ReturnType<typeof rejectReservationService>>;
  try {
    serviceResult = await rejectReservationService(session.id, parsedId.value, parsed.value, new Date());
  } catch (e) {
    console.error("Gagal menolak reservasi", e);
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
        type: "https://ruvana.invalid/problems/invalid-reservation-transition",
        title: "Transisi reservasi tidak valid",
        status: 409,
        detail: err.message,
        instance,
        code: "INVALID_RESERVATION_TRANSITION",
      };
      try {
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 409, responseBody: body });
      } catch {}
      return invalidReservationTransition(instance, err.message);
    }
    return internalError(instance);
  }

  const successBody = serviceResult.data;
  try {
    await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 200, responseBody: successBody });
  } catch {}

  return NextResponse.json(successBody, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
