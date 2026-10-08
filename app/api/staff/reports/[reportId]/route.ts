import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { internalError, notFound } from "@/lib/http/problem";
import { getStaffReportService } from "@/lib/services/report-processing-service";
import { parseReportId } from "@/lib/validation/report-processing";

/** GET /api/staff/reports/{reportId} — detail operasional laporan (REP-03). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/staff/reports/[reportId]">) {
  const instance = new URL(request.url).pathname;
  const { reportId } = await ctx.params;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const parsed = parseReportId(reportId);
  if (!parsed.ok) {
    // Identifier yang tidak ada dimasking sebagai 404 agar tidak membocorkan keberadaan.
    return notFound(instance, "Laporan tidak ditemukan.");
  }

  try {
    const result = await getStaffReportService(parsed.value);
    if (!result.ok) {
      return notFound(instance, result.error.message);
    }
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal mengambil detail laporan", error);
    return internalError(instance);
  }
}
