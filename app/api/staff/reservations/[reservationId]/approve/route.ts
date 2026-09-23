import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAllowedOrigins, validateOrigin } from "@/lib/http/origin";
import {
  approvalConflict,
  csrfOriginRejected,
  internalError,
  invalidReservationTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { approveReservationService } from "@/lib/services/reservation-service";
import { parseReservationId } from "@/lib/validation/reservation-query";

import { guardStaff } from "../../guard";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/staff/reservations/[reservationId]/approve">) {
  const instance = new URL(request.url).pathname;
  const { reservationId } = await ctx.params;

  const session = await guardStaff(request);
  if (session instanceof NextResponse) return session;

  const originResult = validateOrigin(request, getAllowedOrigins());
  if (!originResult.ok) {
    return csrfOriginRejected(instance);
  }

  const parsed = parseReservationId(reservationId);
  if (!parsed.ok) {
    return validationFailed(instance, parsed.errors);
  }

  let serviceResult: Awaited<ReturnType<typeof approveReservationService>>;
  try {
    serviceResult = await approveReservationService(session.user.id, parsed.value, new Date());
  } catch (e) {
    console.error("Gagal menyetujui reservasi", e);
    return internalError(instance);
  }

  if (!serviceResult.ok) {
    const err = serviceResult.error;
    if (err.type === "not_found") {
      return notFound(instance, err.message);
    }
    if (err.type === "transition") {
      return invalidReservationTransition(instance, err.message);
    }
    if (err.type === "conflict") {
      return approvalConflict(instance, err.message, err.availability);
    }
    return internalError(instance);
  }

  return NextResponse.json(serviceResult.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
