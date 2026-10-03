import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { csrfOriginRejected, internalError, invalidReportTransition, notFound } from "@/lib/http/problem";
import { startStaffReportService } from "@/lib/services/report-processing-service";
import { parseReportId } from "@/lib/validation/report-processing";

/**
 * POST /api/staff/reports/{reportId}/start (REP-03).
 *
 * Transisi satu arah NEW -> IN_PROGRESS. Status, petugas penanganan, dan satu
 * instant pemrosesan server disimpan bersama dalam satu transaksi.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reports/[reportId]/start">) {
  const instance = new URL(request.url).pathname;
  const { reportId } = await ctx.params;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const originResult = validateOrigin(request, getAllowedOrigins());
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  const parsed = parseReportId(reportId);
  if (!parsed.ok) {
    return notFound(instance, "Laporan tidak ditemukan.");
  }

  let result: Awaited<ReturnType<typeof startStaffReportService>>;
  try {
    result = await startStaffReportService(session.id, parsed.value, new Date());
  } catch (error) {
    console.error("Gagal memulai penanganan laporan", error);
    return internalError(instance);
  }

  if (!result.ok) {
    if (result.error.type === "not_found") {
      return notFound(instance, result.error.message);
    }
    return invalidReportTransition(instance, result.error.message);
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}