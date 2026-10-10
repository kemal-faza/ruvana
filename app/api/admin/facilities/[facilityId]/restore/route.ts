import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { originError } from "@/lib/http/origin";
import { internalError, notFound, validationFailed } from "@/lib/http/problem";
import { restoreFacility } from "@/lib/services/admin-facility-service";
import { parseFacilityId } from "@/lib/validation/facility-query";

import { guardAdmin } from "../../guard";

/** Pulihkan fasilitas yang diarsipkan (soft delete) kembali ke daftar aktif. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/admin/facilities/[facilityId]/restore">) {
  const instance = request.nextUrl.pathname;
  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  const rejected = originError(request);
  if (rejected) return rejected;

  const { facilityId } = await ctx.params;
  const parsedId = parseFacilityId(facilityId);
  if (!parsedId.ok) return validationFailed(instance, parsedId.errors);

  let result;
  try {
    result = await restoreFacility(parsedId.value);
  } catch (error) {
    console.error("Gagal memulihkan fasilitas", error);
    return internalError(instance);
  }

  if (!result.ok) {
    return notFound(instance, result.error.message);
  }

  revalidateFacilityViews(parsedId.value);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
