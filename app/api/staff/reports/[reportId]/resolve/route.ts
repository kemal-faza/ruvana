import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import {
  badRequest,
  csrfOriginRejected,
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

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

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
  const idempotency = await claimIdempotentRoute({
    key: idempotencyKey,
    principalId: session.id,
    scope: SCOPE,
    requestHash,
    instance,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseReportResolutionBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let result: Awaited<ReturnType<typeof resolveStaffReportService>>;
  try {
    result = await resolveStaffReportService(
      session.id,
      parsedId.value,
      parsed.value.catatanResolusi,
      new Date(),
      async (tx, response) => {
        await idempotency.commit(tx, 200, response);
      },
    );
  } catch (e) {
    console.error("Gagal menyelesaikan laporan", e);
    return idempotency.fail();
  }

  if (!result.ok) {
    const err = result.error;
    if (err.type === "not_found") {
      return idempotency.settle(notFound(instance, err.message));
    }
    return idempotency.settle(invalidReportTransition(instance, err.message));
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
