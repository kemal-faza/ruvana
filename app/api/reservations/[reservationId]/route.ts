import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { forbidden, internalError, notFound, unauthorized, validationFailed } from "@/lib/http/problem";
import { getMyReservationService } from "@/lib/services/reservation-service";
import { parseReservationId } from "@/lib/validation/reservation-query";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/reservations/[reservationId]">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  // 1. Authenticate
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession(request);
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }

  // 2. Verifikasi ACTIVE — akun non-ACTIVE mendapat 401 generik
  if (!session || session.user.status !== "ACTIVE") {
    return unauthorized(instance);
  }

  // 3. Otorisasi role — hanya pengguna
  if (session.user.role !== "pengguna") {
    return forbidden(instance);
  }

  // 4. Validasi id path
  const parsed = parseReservationId(reservationId);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  // 5. Detail milik pengguna sesi saja — milik orang lain termasking 404
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
