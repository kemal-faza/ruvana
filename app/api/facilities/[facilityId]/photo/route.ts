import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { FASILITAS_UPLOAD } from "@/config/business";
import { findPublicFacilityById } from "@/lib/db/facilities";
import { internalError, notFound } from "@/lib/http/problem";
import { createFacilityPhotoReadUrl } from "@/lib/storage/facility-photo";
import { parseFacilityId } from "@/lib/validation/facility-query";

/**
 * Sajikan foto unggahan fasilitas publik. Pathname private Blob tidak pernah
 * bocor: route ini mengalihkan (307) ke signed URL berumur pendek.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/facilities/[facilityId]/photo">) {
  const instance = new URL(request.url).pathname;
  const { facilityId } = await ctx.params;

  const parsed = parseFacilityId(facilityId);
  if (!parsed.ok) return notFound(instance, "Fasilitas tidak ditemukan");

  try {
    const facility = await findPublicFacilityById(parsed.value);
    if (!facility?.foto) return notFound(instance, "Fasilitas tidak ditemukan");

    const url = await createFacilityPhotoReadUrl(facility.foto);
    return NextResponse.redirect(url, {
      status: 307,
      headers: {
        // Cache sesaat di browser: penerbitan signed URL adalah panggilan API Blob,
        // dan satu halaman katalog memuat banyak foto. Masa cache selalu lebih
        // pendek dari masa berlaku signed URL (lihat FASILITAS_UPLOAD).
        "Cache-Control": `private, max-age=${FASILITAS_UPLOAD.masaCacheRedirectFotoDetik}`,
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Gagal menyajikan foto fasilitas", error);
    return internalError(instance);
  }
}
