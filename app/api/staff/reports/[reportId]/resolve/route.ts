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
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import {
  badRequest,
  csrfOriginRejected,
  idempotencyConflict,
  internalError,
  invalidReportTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { resolveStaffReportService } from "@/lib/services/report-processing-service";
import { parseReportId, parseReportResolutionBody } from "@/lib/validation/report-processing";

/**
 * POST /api/staff/reports/{reportId}/resolve (REP-03).
 *
 * Hanya IN_PROGRESS yang dapat menjadi RESOLVED dan catatan penyelesaian wajib.
 * Status, petugas penanganan, catatan, dan satu instant pemrosesan server
 * disimpan bersama dalam satu transaksi.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reports/[reportId]/resolve">) {
  const instance = new URL(request.url).pathname;
  const { reportId } = await ctx.params;

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

  const parsedId = parseReportId(reportId);
  if (!parsedId.ok) {
    return notFound(instance, "Laporan tidak ditemukan.");
  }
  const SCOPE = buildIdempotencyScope("POST", `/api/staff/reports/${parsedId.value}/resolve`);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);

  // Klaim idempotency sebelum operasi bisnis: duplikat bersamaan menunggu lalu
  // me-replay hasil pertama, bukan menutup laporan dua kali.
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

  const parsed = parseReportResolutionBody(rawBody);
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

  let result: Awaited<ReturnType<typeof resolveStaffReportService>>;
  try {
    result = await resolveStaffReportService(
      session.id,
      parsedId.value,
      parsed.value.catatanResolusi,
      new Date(),
      async (tx, response) => {
        const stored = await storeIdempotencyResult(
          idempotencyIdentity,
          { responseStatus: 200, responseBody: response },
          tx,
        );
        if (stored.count !== 1) throw new Error("Klaim idempotency tidak dapat diselesaikan");
      },
    );
  } catch (e) {
    console.error("Gagal menyelesaikan laporan", e);
    try {
      await deleteIdempotencyClaim(idempotencyIdentity);
    } catch {}
    return internalError(instance);
  }

  if (!result.ok) {
    const err = result.error;
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
    const body = {
      type: "https://ruvana.invalid/problems/invalid-report-transition",
      title: "Transisi laporan tidak valid",
      status: 409,
      detail: err.message,
      instance,
      code: "INVALID_REPORT_TRANSITION",
    };
    try {
      await storeIdempotencyResult(idempotencyIdentity, { responseStatus: 409, responseBody: body });
    } catch {}
    return invalidReportTransition(instance, err.message);
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
