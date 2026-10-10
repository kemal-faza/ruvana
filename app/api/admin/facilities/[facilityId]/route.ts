import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import { originError } from "@/lib/http/origin";
import {
  badRequest,
  invalidFacilityTransition,
  notFound,
  validationFailed,
} from "@/lib/http/problem";
import { getAdminFacility, updateFacility } from "@/lib/services/admin-facility-service";
import { parseFacilityId } from "@/lib/validation/facility-query";
import { parseFacilityUpdateBody } from "@/lib/validation/admin-facility";

import { guardAdmin } from "../guard";
import { adminIdempotencyConflict, duplicateName } from "../problem";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/facilities/[facilityId]">) {
  const instance = request.nextUrl.pathname;
  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  const { facilityId } = await ctx.params;
  const parsedId = parseFacilityId(facilityId);
  if (!parsedId.ok) return validationFailed(instance, parsedId.errors);

  const facility = await getAdminFacility(parsedId.value);
  if (!facility) return notFound(instance, "Fasilitas tidak ditemukan");
  return NextResponse.json(facility, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/facilities/[facilityId]">) {
  const instance = request.nextUrl.pathname;
  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  const rejected = originError(request);
  if (rejected) return rejected;

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;

  const { facilityId } = await ctx.params;
  const parsedId = parseFacilityId(facilityId);
  if (!parsedId.ok) return validationFailed(instance, parsedId.errors);

  const scope = buildIdempotencyScope("PATCH", `/api/admin/facilities/${parsedId.value}`);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest(instance, "Body JSON tidak valid");
  }

  const requestHash = hashCanonicalBody(rawBody);
  const idempotency = await claimIdempotentRoute({
    key: idempotencyKey,
    principalId: session.id,
    scope,
    requestHash,
    instance,
    conflictResponse: (kind) => adminIdempotencyConflict(instance, kind),
    mismatchedWaitAsPending: true,
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseFacilityUpdateBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let result;
  try {
    result = await updateFacility(session.id, parsedId.value, parsed.value, new Date(), async (tx, data) => {
      await idempotency.commit(tx, 200, data);
    });
  } catch (error) {
    console.error("Gagal memperbarui fasilitas", error);
    return idempotency.fail();
  }

  if (!result.ok) {
    if (result.error.type === "not_found") {
      return idempotency.settle(notFound(instance, result.error.message));
    }
    if (result.error.type === "transition") {
      return idempotency.settle(invalidFacilityTransition(instance, result.error.message));
    }
    return idempotency.settle(duplicateName(instance));
  }

  revalidateFacilityViews(parsedId.value);
  return NextResponse.json(result.data, { status: 200, headers: { "Cache-Control": "no-store" } });
}
