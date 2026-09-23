import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import {
  badRequest,
  csrfOriginRejected,
  forbidden,
  idempotencyConflict,
  internalError,
  invalidReservationTransition,
  notFound,
  unauthorized,
  validationFailed,
} from "@/lib/http/problem";
import { cancelMyReservationService } from "@/lib/services/reservation-service";
import { parseCancelBody } from "@/lib/validation/reservation";
import { parseReservationId } from "@/lib/validation/reservation-query";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/reservations/[reservationId]/cancel">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  // 1. Authenticate
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession(request);
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  // 2. Verifikasi ACTIVE
  if (!session || session.user.status !== "ACTIVE") {
    return unauthorized(instance);
  }

  // 3. Otorisasi role — hanya pengguna
  if (session.user.role !== "pengguna") {
    return forbidden(instance);
  }

  // 4. Validasi Origin (setelah auth & authorization, sebelum idempotency)
  const allowedOrigins = getAllowedOrigins();
  const originResult = validateOrigin(request, allowedOrigins);
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  // 5. Validasi Idempotency-Key
  const rawKey = request.headers.get("Idempotency-Key");
  if (!isValidIdempotencyKey(rawKey)) {
    return badRequest(instance, "Header Idempotency-Key wajib berupa UUID yang valid");
  }
  const idempotencyKey = rawKey!.trim();

  // 6. Validasi id path (sebelum scope idempotency yang mengikat id)
  const parsedId = parseReservationId(reservationId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }
  const SCOPE = buildIdempotencyScope("POST", `/api/reservations/${parsedId.value}/cancel`);

  // 7. Parse body (butuh body untuk identity hash)
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // 8. Idempotency lookup (replay atau mismatch)
  try {
    const existing = await prisma.idempotencyKey.findFirst({
      where: { key: idempotencyKey, principalId: session.user.id, scope: SCOPE },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return idempotencyConflict(instance);
      }
      if (existing.responseStatus !== null && existing.responseBody !== null) {
        return NextResponse.json(existing.responseBody as object, {
          status: existing.responseStatus,
          headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
        });
      }
    }
  } catch (e) {
    console.error("Gagal lookup idempotency", e);
    return internalError(instance);
  }

  // 9. Validasi body alasan
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
      await prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          principalId: session.user.id,
          scope: SCOPE,
          requestHash,
          responseStatus: 422,
          responseBody: body as unknown as object,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch {
      // Jika race duplicate, abaikan
    }
    return validationFailed(instance, parsed.errors);
  }

  // 10. Operasi bisnis dalam transaksi (ownership + status + batas waktu)
  let serviceResult: Awaited<ReturnType<typeof cancelMyReservationService>>;
  try {
    serviceResult = await cancelMyReservationService(session.user.id, parsedId.value, parsed.value, new Date());
  } catch (e) {
    console.error("Gagal membatalkan reservasi", e);
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
        await prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            principalId: session.user.id,
            scope: SCOPE,
            requestHash,
            responseStatus: 404,
            responseBody: body as unknown as object,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
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
        await prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            principalId: session.user.id,
            scope: SCOPE,
            requestHash,
            responseStatus: 409,
            responseBody: body as unknown as object,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      } catch {}
      return invalidReservationTransition(instance, err.message);
    }
    return internalError(instance);
  }

  // 11. Sukses 200 — simpan untuk replay idempotency
  const successBody = serviceResult.data;
  try {
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        principalId: session.user.id,
        scope: SCOPE,
        requestHash,
        responseStatus: 200,
        responseBody: successBody as unknown as object,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  } catch {
    const existing = await prisma.idempotencyKey.findFirst({
      where: { key: idempotencyKey, principalId: session.user.id, scope: SCOPE },
    });
    if (existing && existing.responseBody) {
      return NextResponse.json(existing.responseBody as object, {
        status: existing.responseStatus ?? 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  return NextResponse.json(successBody, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
