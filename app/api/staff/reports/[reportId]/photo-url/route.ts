import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { guardStaff } from "@/app/api/staff/reservations/guard";
import { LAPORAN_UPLOAD } from "@/config/business";
import { findReportPhotoById } from "@/lib/db/reports";
import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import { blobFailure, csrfOriginRejected, internalError, notFound } from "@/lib/http/problem";
import { createReportPhotoReadUrl } from "@/lib/storage/report-photo";
import { parseReportId } from "@/lib/validation/report-processing";

/**
 * POST /api/staff/reports/{reportId}/photo-url (REP-03).
 *
 * Petugas atau admin yang berwenang memperoleh signed read URL paling lama 5
 * menit. URL private permanen tidak pernah dikembalikan sebagai metadata laporan.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reports/[reportId]/photo-url">) {
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

  let pathname: string | null;
  try {
    const report = await findReportPhotoById(parsed.value);
    pathname = report?.foto ?? null;
  } catch (error) {
    console.error("Gagal memuat metadata foto laporan", error);
    return internalError(instance);
  }
  if (!pathname) {
    return notFound(instance, "Foto laporan tidak ditemukan.");
  }

  try {
    const url = await createReportPhotoReadUrl(pathname);
    return NextResponse.json(
      { url, expiresAt: new Date(Date.now() + LAPORAN_UPLOAD.masaBerlakuUrlBacaMs).toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Gagal menerbitkan URL foto laporan", error);
    return blobFailure(instance);
  }
}