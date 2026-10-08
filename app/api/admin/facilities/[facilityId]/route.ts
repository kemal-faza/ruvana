import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { RETENSI_IDEMPOTENCY_JAM } from "@/config/business";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { buildIdempotencyScope, hashCanonicalBody, isValidIdempotencyKey } from "@/lib/http/idempotency";
import { originError } from "@/lib/http/origin";
import {
  badRequest,
  internalError,
  invalidFacilityTransition,
  notFound,
  problemResponse,
  validationFailed,
} from "@/lib/http/problem";
import { getAdminFacility, updateFacility } from "@/lib/services/admin-facility-service";
import { parseFacilityId } from "@/lib/validation/facility-query";
import { parseFacilityUpdateBody } from "@/lib/validation/admin-facility";

import { guardAdmin } from "../guard";
import { duplicateName, duplicateNameBody, notFoundBody, storeBestEffort, transitionBody, validationFailedBody } from "../problem";

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

  const rawKey = request.headers.get("Idempotency-Key");
  if (!isValidIdempotencyKey(rawKey)) {
    return badRequest(instance, "Header Idempotency-Key wajib berupa UUID yang valid");
  }
  const idempotencyKey = rawKey!.trim();

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
  const identity = {
    key: idempotencyKey,
    principalId: session.id,
    scope,
    requestHash,
    expiresAt: new Date(Date.now() + RETENSI_IDEMPOTENCY_JAM * 60 * 60 * 1000),
  };

  let claim;
  try {
    claim = await claimOrGetIdempotencyKey(identity);
  } catch (error) {
    console.error("Gagal klaim idempotency", error);
    return internalError(instance);
  }
  if (!claim.claimed) {
    if (claim.record.requestHash !== requestHash) {
      return problemResponse({
        status: 409,
        code: "IDEMPOTENCY_KEY_REUSED",
        title: "Konflik permintaan",
        detail: "Idempotency-Key telah digunakan untuk payload berbeda.",
        instance,
      });
    }
    if (isIdempotencySettled(claim.record)) {
      return NextResponse.json(claim.record.responseBody as object, {
        status: claim.record.responseStatus ?? 500,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const settled = await waitForIdempotencyResult({ key: idempotencyKey, principalId: session.id, scope });
    if (settled && settled.requestHash === requestHash) {
      return NextResponse.json(settled.responseBody as object, {
        status: settled.responseStatus ?? 500,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return problemResponse({
      status: 409,
      code: "IDEMPOTENCY_KEY_REUSED",
      title: "Permintaan sedang diproses",
      detail: "Permintaan dengan key yang sama sedang diproses, silakan ulangi.",
      instance,
    });
  }

  const parsed = parseFacilityUpdateBody(rawBody);
  if (!parsed.ok) {
    await storeBestEffort(identity, 422, validationFailedBody(instance, parsed.errors));
    return validationFailed(instance, parsed.errors);
  }

  let result;
  try {
    result = await updateFacility(session.id, parsedId.value, parsed.value, new Date(), async (tx, data) => {
      const stored = await storeIdempotencyResult(identity, { responseStatus: 200, responseBody: data }, tx);
      if (stored.count !== 1) throw new Error("Klaim idempotency tidak dapat diselesaikan");
    });
  } catch (error) {
    console.error("Gagal memperbarui fasilitas", error);
    await deleteIdempotencyClaim(identity).catch(() => {});
    return internalError(instance);
  }

  if (!result.ok) {
    if (result.error.type === "not_found") {
      await storeBestEffort(identity, 404, notFoundBody(instance, result.error.message));
      return notFound(instance, result.error.message);
    }
    if (result.error.type === "transition") {
      await storeBestEffort(identity, 409, transitionBody(instance, result.error.message));
      return invalidFacilityTransition(instance, result.error.message);
    }
    await storeBestEffort(identity, 409, duplicateNameBody(instance));
    return duplicateName(instance);
  }

  revalidateFacilityViews(parsedId.value);
  return NextResponse.json(result.data, { status: 200, headers: { "Cache-Control": "no-store" } });
}
