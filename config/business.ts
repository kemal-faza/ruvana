// Konstanta bisnis terpusat (dipakai logika & UI — jangan hardcode tersebar)
export const JAM_OPERASIONAL = {
  mulai: "07:00",
  selesai: "20:00",
} as const;

export const DURASI_SLOT_MENIT = 30;
export const BATAS_LOGIN_GAGAL = 10;
export const JENDELA_LOGIN_MENIT = 15;
export const MASA_SESI_JAM = 12;
export const RETENSI_IDEMPOTENCY_JAM = 24;
export const BATAS_NAMA_AKUN_KARAKTER = 100;
export const BATAS_EMAIL_AKUN_KARAKTER = 254;
export const BATAS_PASSWORD_AKUN_BYTE = 72;
export const BATAS_PEMBATALAN_JAM = 24; // H-24 jam sebelum mulai (PRD Bagian 20 menggantikan H-2 TASK lama)

export const BATAS_TUJUAN_MIN = 1;
export const BATAS_TUJUAN_MAX = 500;
export const BATAS_ALASAN_MAX = 500;

export const JAKARTA_TIMEZONE = "Asia/Jakarta" as const;

// Daftar waktu mulai yang valid 07:00..19:30 tiap 30 menit
export const VALID_START_TIMES = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
] as const;

export const VALID_END_TIMES = [
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
] as const;

// Daftar role & status (nilai aktual enum di Prisma; konstanta untuk UI/logika)
// Catatan (keputusan tim Fase 0): nilai teknis enum status memakai bahasa Inggris;
// Role & TipeFasilitas tetap bahasa Indonesia sesuai dokumen.
export const ROLE = ["pengguna", "petugas", "admin"] as const;
export const STATUS_AKUN = ["PENDING", "ACTIVE", "REJECTED", "DISABLED"] as const;
export const STATUS_RESERVASI = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_OFFICER",
  "EXPIRED",
] as const;
export const STATUS_LAPORAN = ["NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const;
export const STATUS_FASILITAS = ["ACTIVE", "UNDER_MAINTENANCE", "INACTIVE"] as const;
export const TIPE_FASILITAS = ["ruang_kelas", "aula", "laboratorium", "alat", "lapangan"] as const;

// Label Indonesia untuk tipe fasilitas; nilai enum tetap bahasa Inggris-teknis.
export const TIPE_FASILITAS_LABEL: Record<(typeof TIPE_FASILITAS)[number], string> = {
  ruang_kelas: "Ruang kelas",
  aula: "Aula",
  laboratorium: "Laboratorium",
  alat: "Alat",
  lapangan: "Lapangan",
}

// Kategori laporan kerusakan awal per PRD REP-01 (Modul 4).
export const KATEGORI_LAPORAN = [
  "Listrik",
  "Peralatan",
  "Furnitur",
  "Bangunan",
  "Kebersihan",
  "Lainnya",
] as const

// Batas unggah foto laporan per PRD REP-01: JPEG/PNG/WebP, maksimal 5 MiB.
export const LAPORAN_UPLOAD = {
  tipeDiizinkan: ["image/jpeg", "image/png", "image/webp"] as const,
  maksByte: 5 * 1024 * 1024,
} as const

// Deskripsi laporan mengikuti batas global PRD (2.000 karakter).
export const MAKS_DESKRIPSI_LAPORAN = 2000
