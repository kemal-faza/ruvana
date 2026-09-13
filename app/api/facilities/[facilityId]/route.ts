import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { internalError, notFound, validationFailed } from "@/lib/http/problem";
import { getPublicFacility } from "@/lib/services/facility-service";
import { parseFacilityId } from "@/lib/validation/facility-query";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/facilities/[facilityId]">) {
  const instance = new URL(request.url).pathname;
  const { facilityId } = await ctx.params;

  const parsed = parseFacilityId(facilityId);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  try {
    const facility = await getPublicFacility(parsed.value);
    if (!facility) {
      return notFound(instance, "Fasilitas tidak ditemukan");
    }

    return NextResponse.json(facility, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Gagal mengambil detail fasilitas publik", error);
    return internalError(instance);
  }
}
