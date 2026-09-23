import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { LAPORAN_UPLOAD } from "@/config/business";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reports");

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Verifikasi magic bytes: JPEG (FF D8 FF), PNG (89 50 4E 47 ...), WebP (RIFF....WEBP).
 * Backend menolak file yang klaim MIME-nya tidak cocok dengan isi file (REP-01).
 */
export function detectImageKind(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
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
    return "png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export type SaveReportPhotoResult =
  | { ok: true; webPath: string; contentType: string }
  | { ok: false; message: string };

/**
 * Menyimpan satu foto laporan ke penyimpanan lokal pengembangan dan mengembalikan path publik.
 * Catatan arsitektur: produksi memakai private Vercel Blob (REP-01/7.3) setelah kredensial
 * Blob dan seam sesi tersedia; PostgreSQL tetap hanya menyimpan pathname via kolom `foto`.
 */
export async function saveReportPhoto(file: File): Promise<SaveReportPhotoResult> {
  if (file.size > LAPORAN_UPLOAD.maksByte) {
    return { ok: false, message: `Ukuran foto maksimal ${Math.round(LAPORAN_UPLOAD.maksByte / (1024 * 1024))} MB.` };
  }

  const declared = file.type.toLowerCase();
  if (!(declared in EXT_BY_TYPE)) {
    return { ok: false, message: "Foto harus berupa gambar JPG, PNG, atau WebP." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  const expectedKind = declared === "image/jpeg" ? "jpeg" : declared === "image/png" ? "png" : "webp";
  if (kind !== expectedKind) {
    return { ok: false, message: "Isi file tidak sesuai dengan tipe gambar yang dipilih." };
  }

  const fileName = `${randomUUID()}.${EXT_BY_TYPE[declared]}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), bytes);

  return { ok: true, webPath: `/uploads/reports/${fileName}`, contentType: declared };
}

/**
 * Menghapus foto yang sudah tertulis ketika pembuatan laporan gagal (anti-orphan,
 * lihat PRD 11.3: upload gagal tidak boleh meninggalkan file). Best-effort: kegagalan
 * hapus tidak dilempar agar tidak menutupi error asli.
 */
export async function removeReportPhoto(webPath: string) {
  const fileName = webPath.split("/").pop();
  if (!fileName || fileName === ".." || fileName.includes("/") || fileName.includes("\\")) return;
  try {
    await unlink(path.join(UPLOAD_DIR, fileName));
  } catch {
    // file mungkin sudah tidak ada atau sudah dihapus proses lain — abaikan
  }
}