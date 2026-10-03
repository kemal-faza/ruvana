import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { internalError, validationFailed } from "@/lib/http/problem";
import { listStaffReportQueueService } from "@/lib/services/report-processing-service";
import { parseStaffReportQueueQuery } from "@/lib/validation/report-processing";

/**
 * GET /api/staff/reports — antrean laporan petugas (REP-03, OpenAPI
 * listStaffReports). queue=intake hanya memuat NEW; queue=work memuat NEW dan
 * IN_PROGRESS; queue=riwayat memuat laporan yang sudah RESOLVED atau REJECTED.
 * sort=terlama (bawaan) atau terbaru mengatur urutan antrean. Ringkasan
 * dashboard berada di /api/staff/reports/summary.
 */
export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const parsed = parseStaffReportQueueQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  try {
    const collection = await listStaffReportQueueService(parsed.value);
    return NextResponse.json(collection, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal mengambil antrean laporan", error);
    return internalError(instance);
  }
}
