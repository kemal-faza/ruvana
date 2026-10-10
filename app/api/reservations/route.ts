import { NextRequest, NextResponse } from "next/server";

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
  notFound,
  reservationOverlap,
  unauthorized,
  validationFailed,
} from "@/lib/http/problem";
import { parseReservationCreateBody } from "@/lib/validation/reservation";
import { parseMyReservationListQuery } from "@/lib/validation/reservation-query";
import { createReservationService, listMyReservationsService } from "@/lib/services/reservation-service";

const SCOPE = buildIdempotencyScope("POST", "/api/reservations");

export async function POST(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  // 1. Authenticate via cookie ruvana_session (lib/auth sebagai sumber kebenaran:
  // cookie ada + session ada + belum expired + user ada + status ACTIVE).
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  // 2. Verifikasi ACTIVE (getSessionUser sudah mengembalikan null untuk non-ACTIVE)
  if (!user) {
    return unauthorized(instance);
  }

  // 3. Otorisasi role, hanya pengguna
  if (user.role !== Role.pengguna) {
    return forbidden(instance);
  }

  // 4. Validasi Origin (setelah auth & authorization, sebelum idempotency)
  const allowedOrigins = getAllowedOrigins();
  const originResult = validateOrigin(request, allowedOrigins);
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  // 5. Validasi Idempotency-Key
  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  // 6. Parse body (butuh body untuk identity hash)
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // 7. Klaim idempotency SEBELUM operasi bisnis. Dua request bersamaan dengan
  // key yang sama: hanya pemilik klaim yang menjalankan operasi; yang lain
  // menunggu lalu me-replay hasil pertama (bukan membuat reservasi kedua).
  const idempotency = await claimIdempotentRoute({
    key: idempotencyKey,
    principalId: user.id,
    scope: SCOPE,
    requestHash,
    instance,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseReservationCreateBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  // 9. Operasi bisnis dalam transaksi (row lock facilities + cek APPROVED)
  let serviceResult: Awaited<ReturnType<typeof createReservationService>>;
  try {
    serviceResult = await createReservationService(user.id, parsed.value, new Date(), async (tx, result) => {
      await idempotency.commit(tx, 201, result);
    });
  } catch (e) {
    console.error("Gagal membuat reservasi", e);
    return idempotency.fail();
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "validation") {
      return idempotency.settle(validationFailed(instance, err.errors));
    }
    if (err.type === "not_found") {
      return idempotency.settle(notFound(instance, err.message));
    }
    if (err.type === "conflict") {
      return idempotency.settle(reservationOverlap(instance, err.message, err.availability));
    }
    return idempotency.fail();
  }

  // 10. Sukses 201, simpan untuk replay idempotency
  const successBody = serviceResult.data;
  return NextResponse.json(successBody, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  // 1. Authenticate via cookie ruvana_session (lib/auth sebagai sumber kebenaran)
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  // 2. Verifikasi ACTIVE, akun non-ACTIVE mendapat 401 generik
  // (getSessionUser sudah mengembalikan null untuk non-ACTIVE)
  if (!user) {
    return unauthorized(instance);
  }

  // 3. Otorisasi role, hanya pengguna
  if (user.role !== Role.pengguna) {
    return forbidden(instance);
  }

  // 4. Validasi query (page, perPage, status opsional)
  const parsed = parseMyReservationListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  // 5. Ambil riwayat milik pengguna sesi saja (guard ownership di service/db)
  try {
    const result = await listMyReservationsService(user.id, parsed.value);
    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Gagal mengambil riwayat reservasi", e);
    return internalError(instance);
  }
}
