import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { internalError, validationFailed } from "@/lib/http/problem";
import { listStaffQueueService } from "@/lib/services/reservation-service";
import { parsePublicListQuery } from "@/lib/validation/facility-query";

import { guardStaff } from "./guard";

export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const parsed = parsePublicListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  try {
    const result = await listStaffQueueService(parsed.value);
    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Gagal mengambil antrean reservasi", e);
    return internalError(instance);
  }
}
