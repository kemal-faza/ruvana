import { del, get, head, issueSignedToken, presignUrl } from "@vercel/blob"
import { randomUUID } from "node:crypto"

import { LAPORAN_UPLOAD } from "@/config/business"

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function reportBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN belum dikonfigurasi")
  return token
}

export function isReportPhotoContentType(value: string): value is keyof typeof EXT_BY_TYPE {
  return Object.hasOwn(EXT_BY_TYPE, value.toLowerCase())
}

export function isOwnedReportPhotoPathname(pathname: string, userId: number): boolean {
  const prefix = "reports/" + userId + "/"
  if (!pathname.startsWith(prefix)) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
    pathname.slice(prefix.length),
  )
}

/** Membatasi URL PUT ke pathname acak, MIME, ukuran, operasi, dan masa berlaku. */
export async function createReportPhotoUpload(userId: number, contentType: string, size: number) {
  const normalizedType = contentType.toLowerCase()
  const extension = EXT_BY_TYPE[normalizedType]
  if (!extension) throw new Error("Tipe foto laporan tidak didukung")

  const pathname = "reports/" + userId + "/" + randomUUID() + "." + extension
  const validUntil = Date.now() + LAPORAN_UPLOAD.masaBerlakuUrlUnggahMs
  const signedToken = await issueSignedToken({
    token: reportBlobToken(),
    pathname,
    operations: ["put"],
    validUntil,
    allowedContentTypes: [normalizedType],
    maximumSizeInBytes: size,
  })
  const { presignedUrl } = await presignUrl(signedToken, {
    access: "private",
    operation: "put",
    pathname,
    validUntil,
    allowedContentTypes: [normalizedType],
    maximumSizeInBytes: size,
    allowOverwrite: false,
    addRandomSuffix: false,
  })

  return { pathname, uploadUrl: presignedUrl, validUntil }
}

/** Verifikasi metadata Blob dan magic bytes sebelum foto dikaitkan ke laporan. */
export async function verifyReportPhotoUpload(
  pathname: string,
  userId: number,
  expectedType: string,
  expectedSize: number,
): Promise<{ contentType: string; size: number } | null> {
  if (!isOwnedReportPhotoPathname(pathname, userId)) return null
  if (!isReportPhotoContentType(expectedType) || !Number.isSafeInteger(expectedSize)) return null
  if (expectedSize < 1 || expectedSize > LAPORAN_UPLOAD.maksByte) return null

  let metadata: Awaited<ReturnType<typeof head>>
  try {
    metadata = await head(pathname, { token: reportBlobToken() })
  } catch {
    return null
  }

  if (
    metadata.pathname !== pathname ||
    metadata.contentType.toLowerCase() !== expectedType.toLowerCase() ||
    metadata.size !== expectedSize ||
    metadata.size > LAPORAN_UPLOAD.maksByte
  ) {
    return null
  }

  const blob = await get(pathname, { access: "private", token: reportBlobToken() }).catch(() => null)
  if (!blob || blob.statusCode !== 200) return null

  const header = new Uint8Array(12)
  let headerSize = 0
  let actualSize = 0
  const reader = blob.stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      actualSize += value.byteLength
      if (actualSize > LAPORAN_UPLOAD.maksByte) {
        await reader.cancel()
        return null
      }
      const remaining = header.length - headerSize
      if (remaining > 0) {
        const chunk = value.subarray(0, remaining)
        header.set(chunk, headerSize)
        headerSize += chunk.byteLength
      }
    }
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }

  if (actualSize !== metadata.size || !matchesImageKind(detectImageKind(header.subarray(0, headerSize)), expectedType)) {
    return null
  }

  return { contentType: metadata.contentType.toLowerCase(), size: actualSize }
}

export async function createReportPhotoReadUrl(pathname: string) {
  const validUntil = Date.now() + LAPORAN_UPLOAD.masaBerlakuUrlBacaMs
  const signedToken = await issueSignedToken({ token: reportBlobToken(), pathname, operations: ["get"], validUntil })
  const { presignedUrl } = await presignUrl(signedToken, {
    access: "private",
    operation: "get",
    pathname,
    validUntil,
    useCache: false,
  })
  return presignedUrl
}

/** Hapus best-effort; pemanggil wajib memastikan foto belum terkait laporan. */
export async function removeReportPhoto(pathname: string, userId: number) {
  if (!isOwnedReportPhotoPathname(pathname, userId)) return
  try {
    await del(pathname, { token: reportBlobToken() })
  } catch {
    // Objek mungkin sudah dihapus atau masa berlaku unggahnya sudah habis.
  }
}

/** Verifikasi signature JPEG/PNG/WebP berdasarkan magic bytes. */
export function detectImageKind(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg"
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png"
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) {
    return "webp"
  }
  return null
}

function matchesImageKind(kind: ReturnType<typeof detectImageKind>, contentType: string) {
  return (
    (kind === "jpeg" && contentType.toLowerCase() === "image/jpeg") ||
    (kind === "png" && contentType.toLowerCase() === "image/png") ||
    (kind === "webp" && contentType.toLowerCase() === "image/webp")
  )
}
