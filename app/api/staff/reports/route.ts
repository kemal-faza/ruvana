import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { internalError } from "@/lib/http/problem";
import { listStaffReportWork } from "@/lib/services/report-service";

export async function GET(request: NextRequest) {
  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  try {
    const summary = await listStaffReportWork();
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal mengambil ringkasan pekerjaan laporan", error);
    return internalError(new URL(request.url).pathname);
  }
}
