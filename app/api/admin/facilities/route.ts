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
import { badRequest, internalError, problemResponse, validationFailed } from "@/lib/http/problem";
import { createFacility, listAdminFacilities } from "@/lib/services/admin-facility-service";
import { parseAdminListQuery, parseFacilityCreateBody } from "@/lib/validation/admin-facility";

import { guardAdmin } from "./guard";

const ALLOWED_LIST_PARAMS = new Set(["page", "perPage", "search", "type", "location", "status"]);

function duplicateName(instance: string) {
  return problemResponse({
    status: 409,
    code: "FACILITY_NAME_ALREADY_USED",
    title: "Nama fasilitas sudah digunakan",
    detail: "Nama fasilitas harus unik.",
    instance,
  });
}

export async function GET(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  const params = request.nextUrl.searchParams;
  const unknown = [...params.keys()].filter((key) => !ALLOWED_LIST_PARAMS.has(key));
  if (unknown.length > 0) {
    return validationFailed(
      instance,
      unknown.map((field) => ({ field, code: "UNKNOWN_FIELD", message: "Parameter tidak dikenal" })),
    );
  }

  const parsed = parseAdminListQuery(params);
  if (!parsed.ok) return validationFailed(instance, parsed.errors);

  const result = await listAdminFacilities(parsed.value);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
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
  const scope = buildIdempotencyScope("POST", "/api/admin/facilities");

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
    if (settled) {
      if (settled.requestHash !== requestHash) {
        return problemResponse({
          status: 409,
          code: "IDEMPOTENCY_KEY_REUSED",
          title: "Konflik permintaan",
          detail: "Idempotency-Key telah digunakan untuk payload berbeda.",
          instance,
        });
      }
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

  const parsed = parseFacilityCreateBody(rawBody);
  if (!parsed.ok) {
    await storeBestEffort(identity, 422, validationFailedBody(instance, parsed.errors));
    return validationFailed(instance, parsed.errors);
  }

  let result;
  try {
    result = await createFacility(parsed.value);
  } catch (error) {
    console.error("Gagal membuat fasilitas", error);
    await deleteIdempotencyClaim(identity).catch(() => {});
    return internalError(instance);
  }

  if (!result.ok) {
    await storeBestEffort(identity, 409, duplicateNameBody(instance));
    return duplicateName(instance);
  }

  revalidateFacilityViews(result.data.id);
  await storeBestEffort(identity, 201, result.data);
  return NextResponse.json(result.data, { status: 201, headers: { "Cache-Control": "no-store" } });
}

async function storeBestEffort(
  identity: Parameters<typeof storeIdempotencyResult>[0],
  status: number,
  body: unknown,
) {
  try {
    await storeIdempotencyResult(identity, { responseStatus: status, responseBody: body });
  } catch {
    // Replay bersifat best-effort; respons tetap dikembalikan.
  }
}

function validationFailedBody(instance: string, errors: unknown) {
  return {
    type: "https://ruvana.invalid/problems/validation-failed",
    title: "Validasi gagal",
    status: 422,
    detail: "Satu atau lebih field tidak memenuhi aturan validasi",
    instance,
    code: "VALIDATION_FAILED",
    errors,
  };
}

function duplicateNameBody(instance: string) {
  return {
    type: "https://ruvana.invalid/problems/facility-name-already-used",
    title: "Nama fasilitas sudah digunakan",
    status: 409,
    detail: "Nama fasilitas harus unik.",
    instance,
    code: "FACILITY_NAME_ALREADY_USED",
  };
}
