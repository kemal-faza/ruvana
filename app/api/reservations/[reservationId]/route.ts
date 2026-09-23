import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { forbidden, internalError, notFound, unauthorized, validationFailed } from "@/lib/http/problem";
import { getMyReservationService } from "@/lib/services/reservation-service";
import { parseReservationId } from "@/lib/validation/reservation-query";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/reservations/[reservationId]">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession(request);
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  if (!session || session.user.status !== "ACTIVE") {
    return unauthorized(instance);
  }

  if (session.user.role !== "pengguna") {
    return forbidden(instance);
  }

  const parsed = parseReservationId(reservationId);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  try {
    const result = await getMyReservationService(session.user.id, parsed.value);
    if (!result.ok) {
      return notFound(instance, result.error.message);
    }
    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Gagal mengambil detail reservasi", e);
    return internalError(instance);
  }
}
