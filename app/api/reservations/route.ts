import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import {
  badRequest,
  csrfOriginRejected,
  forbidden,
  idempotencyConflict,
  internalError,
  notFound,
  reservationOverlap,
  unauthorized,
  validationFailed,
} from "@/lib/http/problem";
import { parseReservationCreateBody } from "@/lib/validation/reservation";
import { parseMyReservationListQuery } from "@/lib/validation/reservation-query";
import { createReservationService, listMyReservationsService } from "@/lib/services/reservation-service";
import { prisma } from "@/lib/prisma";

const SCOPE = buildIdempotencyScope("POST", "/api/reservations");

export async function POST(request: NextRequest) {
  const instance = new URL(request.url).pathname;

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

  // 3. Otorisasi role, hanya pengguna
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

  // 6. Parse body (butuh body untuk identity hash)
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // 7. Idempotency lookup (replay atau mismatch)
  try {
    const existing = await prisma.idempotencyKey.findFirst({
      where: { key: idempotencyKey, principalId: session.user.id, scope: SCOPE },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return idempotencyConflict(instance);
      }
      // Replay hanya untuk hasil deterministik yang pernah disimpan
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

  // 8. Validasi body dengan ParseResult
  const parsed = parseReservationCreateBody(rawBody);
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

  // 9. Operasi bisnis dalam transaksi (row lock facilities + cek APPROVED)
  let serviceResult: Awaited<ReturnType<typeof createReservationService>>;
  try {
    serviceResult = await createReservationService(session.user.id, parsed.value, new Date());
  } catch (e) {
    console.error("Gagal membuat reservasi", e);
    return internalError(instance);
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "validation") {
      const body = {
        type: "https://ruvana.invalid/problems/validation-failed",
        title: "Validasi gagal",
        status: 422,
        detail: "Satu atau lebih field tidak memenuhi aturan validasi",
        instance,
        code: "VALIDATION_FAILED",
        errors: err.errors,
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
      } catch {}
      return validationFailed(instance, err.errors);
    }
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
    if (err.type === "conflict") {
      const body = {
        type: "https://ruvana.invalid/problems/reservation-overlap",
        title: "Reservasi bertabrakan",
        status: 409,
        detail: err.message,
        instance,
        code: "RESERVATION_OVERLAP",
        availability: err.availability,
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
      return reservationOverlap(instance, err.message, err.availability);
    }
    return internalError(instance);
  }

  // 10. Sukses 201, simpan untuk replay idempotency
  const successBody = serviceResult.data;
  try {
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        principalId: session.user.id,
        scope: SCOPE,
        requestHash,
        responseStatus: 201,
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
        status: existing.responseStatus ?? 201,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  return NextResponse.json(successBody, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  // 1. Authenticate
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession(request);
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  // 2. Verifikasi ACTIVE, akun non-ACTIVE mendapat 401 generik
  if (!session || session.user.status !== "ACTIVE") {
    return unauthorized(instance);
  }

  // 3. Otorisasi role, hanya pengguna
  if (session.user.role !== "pengguna") {
    return forbidden(instance);
  }

  // 4. Validasi query (page, perPage, status opsional)
  const parsed = parseMyReservationListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  // 5. Ambil riwayat milik pengguna sesi saja (guard ownership di service/db)
  try {
    const result = await listMyReservationsService(session.user.id, parsed.value);
    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Gagal mengambil riwayat reservasi", e);
    return internalError(instance);
  }
}
