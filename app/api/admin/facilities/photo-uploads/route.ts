import { NextRequest, NextResponse } from "next/server";

import { FASILITAS_UPLOAD } from "@/config/business";
import { findFacilityByFoto } from "@/lib/db/admin-facilities";
import { badRequest, internalError, validationFailed } from "@/lib/http/problem";
import { originError } from "@/lib/http/origin";
import {
  createFacilityPhotoUpload,
  isFacilityPhotoContentType,
  isOwnedFacilityPhotoPathname,
  removeFacilityPhoto,
} from "@/lib/storage/facility-photo";

import { guardAdmin } from "../guard";

export async function POST(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  const rejected = originError(request);
  if (rejected) return rejected;

  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(instance, "Metadata foto tidak valid.");
  }
  if (!body || typeof body !== "object") return badRequest(instance, "Metadata foto tidak valid.");

  const record = body as Record<string, unknown>;
  const contentType = typeof record.contentType === "string" ? record.contentType.toLowerCase() : "";
  const size = record.size;
  const errors = [];
  if (
    !isFacilityPhotoContentType(contentType) ||
    !(FASILITAS_UPLOAD.tipeDiizinkan as readonly string[]).includes(contentType)
  ) {
    errors.push({ field: "contentType", code: "INVALID_CONTENT_TYPE", message: "Foto harus berupa JPEG, PNG, atau WebP." });
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > FASILITAS_UPLOAD.maksByte) {
    errors.push({ field: "size", code: "OUT_OF_RANGE", message: "Ukuran foto harus lebih dari 0 dan maksimal 5 MB." });
  }
  if (errors.length > 0) return validationFailed(instance, errors);

  try {
    const upload = await createFacilityPhotoUpload(session.id, contentType, size as number);
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Gagal menerbitkan URL unggah foto fasilitas");
    return internalError(instance);
  }
}

export async function DELETE(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  const rejected = originError(request);
  if (rejected) return rejected;

  const session = await guardAdmin(request);
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(instance, "Pathname foto tidak valid.");
  }
  const pathname = body && typeof body === "object" ? (body as Record<string, unknown>).pathname : null;
  if (typeof pathname !== "string" || !isOwnedFacilityPhotoPathname(pathname, session.id)) {
    return badRequest(instance, "Pathname foto tidak valid.");
  }

  try {
    // Hanya bersihkan unggahan yang belum terpasang ke fasilitas mana pun.
    const attached = await findFacilityByFoto(pathname);
    if (!attached) await removeFacilityPhoto(pathname, session.id);
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Gagal membersihkan foto fasilitas sementara");
    return internalError(instance);
  }
}
