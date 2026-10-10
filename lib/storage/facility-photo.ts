import { del, get, head, issueSignedToken, presignUrl } from "@vercel/blob"
import { randomUUID } from "node:crypto"

import { FASILITAS_UPLOAD } from "@/config/business"
import { detectImageKind } from "@/lib/storage/report-photo"

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function facilityBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN belum dikonfigurasi")
  return token
}

export function isFacilityPhotoContentType(value: string): value is keyof typeof EXT_BY_TYPE {
  return Object.hasOwn(EXT_BY_TYPE, value.toLowerCase())
}

export function isOwnedFacilityPhotoPathname(pathname: string, userId: number): boolean {
  const prefix = "facilities/" + userId + "/"
  if (!pathname.startsWith(prefix)) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
    pathname.slice(prefix.length),
  )
}

/** Membatasi URL PUT ke pathname acak, MIME, ukuran, operasi, dan masa berlaku. */
export async function createFacilityPhotoUpload(userId: number, contentType: string, size: number) {
  const normalizedType = contentType.toLowerCase()
  const extension = EXT_BY_TYPE[normalizedType]
  if (!extension) throw new Error("Tipe foto fasilitas tidak didukung")

  const pathname = "facilities/" + userId + "/" + randomUUID() + "." + extension
  const validUntil = Date.now() + FASILITAS_UPLOAD.masaBerlakuUrlUnggahMs
  const signedToken = await issueSignedToken({
    token: facilityBlobToken(),
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

/** Verifikasi metadata Blob dan magic bytes sebelum foto dikaitkan ke fasilitas. */
export async function verifyFacilityPhotoUpload(
  pathname: string,
  userId: number,
  expectedType: string,
  expectedSize: number,
): Promise<{ contentType: string; size: number } | null> {
  if (!isOwnedFacilityPhotoPathname(pathname, userId)) return null
  if (!isFacilityPhotoContentType(expectedType) || !Number.isSafeInteger(expectedSize)) return null
  if (expectedSize < 1 || expectedSize > FASILITAS_UPLOAD.maksByte) return null

  let metadata: Awaited<ReturnType<typeof head>>
  try {
    metadata = await head(pathname, { token: facilityBlobToken() })
  } catch {
    return null
  }

  if (
    metadata.pathname !== pathname ||
    metadata.contentType.toLowerCase() !== expectedType.toLowerCase() ||
    metadata.size !== expectedSize ||
    metadata.size > FASILITAS_UPLOAD.maksByte
  ) {
    return null
  }

  const blob = await get(pathname, { access: "private", token: facilityBlobToken() }).catch(() => null)
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
      if (actualSize > FASILITAS_UPLOAD.maksByte) {
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

  if (
    actualSize !== metadata.size ||
    !matchesImageKind(detectImageKind(header.subarray(0, headerSize)), expectedType)
  ) {
    return null
  }

  return { contentType: metadata.contentType.toLowerCase(), size: actualSize }
}

export async function createFacilityPhotoReadUrl(pathname: string) {
  const validUntil = Date.now() + FASILITAS_UPLOAD.masaBerlakuUrlBacaMs
  const signedToken = await issueSignedToken({ token: facilityBlobToken(), pathname, operations: ["get"], validUntil })
  const { presignedUrl } = await presignUrl(signedToken, {
    access: "private",
    operation: "get",
    pathname,
    validUntil,
    useCache: false,
  })
  return presignedUrl
}

/** Hapus best-effort; pemanggil wajib memastikan pathname milik fasilitas yang berhak. */
export async function removeFacilityPhoto(pathname: string, userId: number) {
  if (!isOwnedFacilityPhotoPathname(pathname, userId)) return
  try {
    await del(pathname, { token: facilityBlobToken() })
  } catch {
    // Objek mungkin sudah dihapus atau masa berlaku unggahnya sudah habis.
  }
}

/**
 * Hapus best-effort untuk pathname yang berasal dari database (foto fasilitas
 * yang diganti/dihapus). Pathname tepercaya sehingga tak dicek kepemilikannya.
 */
export async function removeFacilityPhotoObject(pathname: string) {
  try {
    await del(pathname, { token: facilityBlobToken() })
  } catch {
    // Objek mungkin sudah dihapus sebelumnya.
  }
}

function matchesImageKind(kind: ReturnType<typeof detectImageKind>, contentType: string) {
  return (
    (kind === "jpeg" && contentType.toLowerCase() === "image/jpeg") ||
    (kind === "png" && contentType.toLowerCase() === "image/png") ||
    (kind === "webp" && contentType.toLowerCase() === "image/webp")
  )
}
