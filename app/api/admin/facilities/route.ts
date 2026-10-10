import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import { originError } from "@/lib/http/origin";
import { badRequest, validationFailed } from "@/lib/http/problem";
import { createFacility, listAdminFacilities } from "@/lib/services/admin-facility-service";
import { parseAdminListQuery, parseFacilityCreateBody } from "@/lib/validation/admin-facility";

import { guardAdmin } from "./guard";
import { adminIdempotencyConflict, duplicateName } from "./problem";

const ALLOWED_LIST_PARAMS = new Set(["page", "perPage", "search", "type", "location", "status"]);

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

  const idempotencyKey = readIdempotencyKey(request, instance);
  if (idempotencyKey instanceof NextResponse) return idempotencyKey;
  const scope = buildIdempotencyScope("POST", "/api/admin/facilities");

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
  });
  if (idempotency instanceof NextResponse) return idempotency;

  const parsed = parseFacilityCreateBody(rawBody);
  if (!parsed.ok) {
    return idempotency.settle(validationFailed(instance, parsed.errors));
  }

  let result;
  try {
    // Replay disimpan di dalam transaksi yang sama dengan pembuatan fasilitas,
    // mengikuti PATCH: klaim tidak boleh menggantung tanpa hasil bila proses mati
    // di antara commit dan penyimpanan.
    result = await createFacility(parsed.value, async (tx, data) => {
      await idempotency.commit(tx, 201, data);
    });
  } catch (error) {
    console.error("Gagal membuat fasilitas", error);
    return idempotency.fail();
  }

  if (!result.ok) {
    return idempotency.settle(duplicateName(instance));
  }

  revalidateFacilityViews(result.data.id);
  return NextResponse.json(result.data, { status: 201, headers: { "Cache-Control": "no-store" } });
}
