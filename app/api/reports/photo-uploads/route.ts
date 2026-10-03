import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { LAPORAN_UPLOAD } from "@/config/business"
import { Role } from "@/generated/prisma/enums"
import { findReportByFoto } from "@/lib/db/reports"
import { consumeReportUploadRateLimit } from "@/lib/db/report-upload-rate-limit"
import { badRequest, forbidden, internalError, unauthorized, validationFailed } from "@/lib/http/problem"
import { getSessionUser } from "@/lib/auth"
import { originError } from "@/lib/http/origin"
import { createReportPhotoUpload, isOwnedReportPhotoPathname, isReportPhotoContentType, removeReportPhoto } from "@/lib/storage/report-photo"

export async function POST(request: NextRequest) {
  const instance = request.nextUrl.pathname
  const rejected = originError(request)
  if (rejected) return rejected

  let user: Awaited<ReturnType<typeof getSessionUser>>
  try {
    user = await getSessionUser()
  } catch {
    return internalError(instance)
  }
  if (!user) return unauthorized(instance)
  if (user.role !== Role.pengguna) return forbidden(instance)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest(instance, "Metadata foto tidak valid.")
  }
  if (!body || typeof body !== "object") return badRequest(instance, "Metadata foto tidak valid.")

  const record = body as Record<string, unknown>
  const contentType = typeof record.contentType === "string" ? record.contentType.toLowerCase() : ""
  const size = record.size
  const errors = []
  if (!isReportPhotoContentType(contentType) || !LAPORAN_UPLOAD.tipeDiizinkan.includes(contentType as (typeof LAPORAN_UPLOAD.tipeDiizinkan)[number])) {
    errors.push({ field: "contentType", code: "INVALID_CONTENT_TYPE", message: "Foto harus berupa JPEG, PNG, atau WebP." })
  }
  if (!Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > LAPORAN_UPLOAD.maksByte) {
    errors.push({ field: "size", code: "OUT_OF_RANGE", message: "Ukuran foto harus lebih dari 0 dan maksimal 5 MB." })
  }
  if (errors.length > 0) return validationFailed(instance, errors)

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = request.headers.get("x-real-ip")?.trim() || forwardedIp || "unknown"
  const ipHash = createHash("sha256").update(ip).digest("hex")

  try {
    const allowed = await consumeReportUploadRateLimit(user.id, ipHash)
    if (!allowed) {
      return NextResponse.json(
        {
          type: "https://ruvana.invalid/problems/rate-limited",
          title: "Batas unggah tercapai",
          status: 429,
          detail: "Batas penerbitan URL unggah per jam tercapai. Coba lagi nanti.",
          instance,
          code: "RATE_LIMITED",
        },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      )
    }

    const upload = await createReportPhotoUpload(user.id, contentType, size as number)
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } })
  } catch {
    console.error("Gagal menerbitkan URL unggah foto laporan")
    return internalError(instance)
  }
}

export async function DELETE(request: NextRequest) {
  const instance = request.nextUrl.pathname
  const rejected = originError(request)
  if (rejected) return rejected

  let user: Awaited<ReturnType<typeof getSessionUser>>
  try {
    user = await getSessionUser()
  } catch {
    return internalError(instance)
  }
  if (!user) return unauthorized(instance)
  if (user.role !== Role.pengguna) return forbidden(instance)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest(instance, "Pathname foto tidak valid.")
  }
  const pathname = body && typeof body === "object" ? (body as Record<string, unknown>).pathname : null
  if (typeof pathname !== "string" || !isOwnedReportPhotoPathname(pathname, user.id)) {
    return badRequest(instance, "Pathname foto tidak valid.")
  }

  try {
    const associatedReport = await findReportByFoto(pathname)
    if (!associatedReport) await removeReportPhoto(pathname, user.id)
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } })
  } catch {
    console.error("Gagal membersihkan foto laporan sementara")
    return internalError(instance)
  }
}
