import { NextRequest, NextResponse } from "next/server";

import { RETENSI_IDEMPOTENCY_JAM } from "@/config/business";
import { getSessionUser } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
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
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";

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

  // 7. Klaim idempotency SEBELUM operasi bisnis. Dua request bersamaan dengan
  // key yang sama: hanya pemilik klaim yang menjalankan operasi; yang lain
  // menunggu lalu me-replay hasil pertama (bukan membuat reservasi kedua).
  const idempotencyIdentity = {
    key: idempotencyKey,
    principalId: user.id,
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
        principalId: user.id,
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
      await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 422, responseBody: body });
    } catch {
      // Penyimpanan replay best-effort; respons tetap dikembalikan
    }
    return validationFailed(instance, parsed.errors);
  }

  // 9. Operasi bisnis dalam transaksi (row lock facilities + cek APPROVED)
  let serviceResult: Awaited<ReturnType<typeof createReservationService>>;
  try {
    serviceResult = await createReservationService(user.id, parsed.value, new Date(), async (tx, result) => {
      const stored = await storeIdempotencyResult(
        idempotencyIdentity,
        { responseStatus: 201, responseBody: result },
        tx,
      );
      if (stored.count !== 1) throw new Error("Klaim idempotency tidak dapat diselesaikan");
    });
  } catch (e) {
    console.error("Gagal membuat reservasi", e);
    try {
      // 5xx tidak disimpan/di-replay: hapus klaim agar retry dapat diproses.
      await deleteIdempotencyClaim(idempotencyIdentity);
    } catch {}
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
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 422, responseBody: body });
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
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 404, responseBody: body });
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
        await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 409, responseBody: body });
      } catch {}
      return reservationOverlap(instance, err.message, err.availability);
    }
    try {
      await deleteIdempotencyClaim(idempotencyIdentity);
    } catch {}
    return internalError(instance);
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
