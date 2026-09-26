import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"

import { LAPORAN_UPLOAD } from "@/config/business"
import { Role } from "@/generated/prisma/enums"
import { getSessionUser } from "@/lib/auth"
import { findReportPhotoById } from "@/lib/db/reports"
import { forbidden, internalError, notFound, unauthorized } from "@/lib/http/problem"
import {
  createReportPhotoReadUrl,
  detectImageKind,
  isOwnedReportPhotoPathname,
  isReportPhotoContentType,
} from "@/lib/storage/report-photo"

const LEGACY_PHOTO = /^\/uploads\/reports\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i

export async function GET(request: NextRequest, ctx: RouteContext<"/api/reports/[reportId]/photo">) {
  const instance = request.nextUrl.pathname

  let user: Awaited<ReturnType<typeof getSessionUser>>
  try {
    user = await getSessionUser()
  } catch {
    return internalError(instance)
  }
  if (!user) return unauthorized(instance)

  const rawId = (await ctx.params).reportId
  if (!/^\d+$/.test(rawId)) return notFound(instance, "Laporan tidak ditemukan.")
  const reportId = Number(rawId)
  if (!Number.isSafeInteger(reportId) || reportId < 1) return notFound(instance, "Laporan tidak ditemukan.")

  try {
    const report = await findReportPhotoById(reportId)
    if (!report?.foto) return notFound(instance, "Foto laporan tidak ditemukan.")
    if (user.id !== report.userId && user.role !== Role.petugas && user.role !== Role.admin) {
      return forbidden(instance)
    }

    const legacyMatch = LEGACY_PHOTO.exec(report.foto)
    if (legacyMatch) {
      return await serveLegacyPhoto(report.foto, legacyMatch[2].toLowerCase(), report.fotoContentType, report.fotoSize, instance)
    }

    if (!isOwnedReportPhotoPathname(report.foto, report.userId)) {
      return notFound(instance, "Foto laporan tidak ditemukan.")
    }

    const signedUrl = await createReportPhotoReadUrl(report.foto)
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    })
  } catch {
    console.error("Gagal menyajikan foto laporan")
    return internalError(instance)
  }
}

async function serveLegacyPhoto(
  webPath: string,
  extension: string,
  storedContentType: string | null,
  storedSize: number | null,
  instance: string,
) {
  const contentType = storedContentType?.toLowerCase() ?? (extension === "jpg" ? "image/jpeg" : "image/" + extension)
  if (!isReportPhotoContentType(contentType)) return notFound(instance, "Foto laporan tidak ditemukan.")

  try {
    const fileName = webPath.split("/").at(-1)
    if (!fileName) return notFound(instance, "Foto laporan tidak ditemukan.")
    const filePath = path.join(process.cwd(), ".local-storage", "report-photos", fileName)
    const bytes = await readFile(filePath)
    if (bytes.byteLength < 1 || bytes.byteLength > LAPORAN_UPLOAD.maksByte) {
      return notFound(instance, "Foto laporan tidak ditemukan.")
    }
    if (storedSize != null && storedSize !== bytes.byteLength) return notFound(instance, "Foto laporan tidak ditemukan.")

    const kind = detectImageKind(bytes)
    const matches =
      (kind === "jpeg" && contentType === "image/jpeg") ||
      (kind === "png" && contentType === "image/png") ||
      (kind === "webp" && contentType === "image/webp")
    if (!matches) return notFound(instance, "Foto laporan tidak ditemukan.")

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    })
  } catch {
    return notFound(instance, "Foto laporan tidak ditemukan.")
  }
}
