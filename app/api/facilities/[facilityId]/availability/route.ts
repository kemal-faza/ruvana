import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { internalError, notFound, validationFailed } from "@/lib/http/problem";
import { getFacilityAvailability } from "@/lib/services/availability-service";
import { parseAvailabilityDate, parseFacilityId } from "@/lib/validation/facility-query";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/facilities/[facilityId]/availability">) {
  const instance = new URL(request.url).pathname;
  const { facilityId } = await ctx.params;

  const parsedId = parseFacilityId(facilityId);
  if (!parsedId.ok) {
    return validationFailed(instance, parsedId.errors);
  }

  const parsedDate = parseAvailabilityDate(request.nextUrl.searchParams.get("date"));
  if (!parsedDate.ok) {
    return validationFailed(instance, parsedDate.errors);
  }

  try {
    const availability = await getFacilityAvailability(parsedId.value, parsedDate.value);
    if (!availability) {
      return notFound(instance, "Fasilitas tidak ditemukan");
    }

    return NextResponse.json(availability, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Gagal mengambil ketersediaan fasilitas", error);
    return internalError(instance);
  }
}
