import { KATEGORI_LAPORAN, LAPORAN_UPLOAD, MAKS_DESKRIPSI_LAPORAN } from "@/config/business";

export interface ReportSubmissionErrors {
  facilityId?: string;
  kategori?: string;
  deskripsi?: string;
  foto?: string;
}

export interface ReportFormInput {
  facilityId: number | null;
  kategori: string;
  deskripsi: string;
  hasFoto: boolean;
  fotoType?: string;
  fotoSize?: number | null;
}

export type ReportValidationResult =
  | { ok: true }
  | { ok: false; errors: ReportSubmissionErrors };

const FOTO_TIPE_DIIZINKAN: readonly string[] = [...LAPORAN_UPLOAD.tipeDiizinkan];

/** Validasi form laporan kerusakan (REP-01): fasilitas, kategori PRD, deskripsi, dan satu foto wajib. */
export function validateReportSubmission(input: ReportFormInput): ReportValidationResult {
  const errors: ReportSubmissionErrors = {};

  if (!input.facilityId || input.facilityId < 1) {
    errors.facilityId = "Pilih fasilitas yang dilaporkan.";
  }

  if (!input.kategori) {
    errors.kategori = "Pilih kategori laporan.";
  } else if (!KATEGORI_LAPORAN.includes(input.kategori as (typeof KATEGORI_LAPORAN)[number])) {
    errors.kategori = "Kategori laporan tidak valid.";
  }

  const deskripsi = input.deskripsi.trim();
  if (!deskripsi) {
    errors.deskripsi = "Tuliskan deskripsi kerusakan.";
  } else if (deskripsi.length > MAKS_DESKRIPSI_LAPORAN) {
    errors.deskripsi = `Deskripsi maksimal ${MAKS_DESKRIPSI_LAPORAN} karakter.`;
  }

  if (!input.hasFoto) {
    errors.foto = "Foto wajib dilampirkan.";
  } else if (!input.fotoType || !FOTO_TIPE_DIIZINKAN.includes(input.fotoType.toLowerCase())) {
    errors.foto = "Foto harus berupa gambar JPG, PNG, atau WebP.";
  } else if (input.fotoSize != null && (!Number.isSafeInteger(input.fotoSize) || input.fotoSize < 1)) {
    errors.foto = "Ukuran foto tidak valid.";
  } else if (input.fotoSize != null && input.fotoSize > LAPORAN_UPLOAD.maksByte) {
    errors.foto = `Ukuran foto maksimal ${Math.round(LAPORAN_UPLOAD.maksByte / (1024 * 1024))} MB.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
