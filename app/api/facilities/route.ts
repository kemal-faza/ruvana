import { NextRequest, NextResponse } from "next/server";

import { internalError, validationFailed } from "@/lib/http/problem";
import { listPublicFacilities } from "@/lib/services/facility-service";
import { parsePublicListQuery } from "@/lib/validation/facility-query";

export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  const parsed = parsePublicListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  try {
    const result = await listPublicFacilities(parsed.value);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Gagal mengambil daftar fasilitas publik", error);
    return internalError(instance);
  }
}
