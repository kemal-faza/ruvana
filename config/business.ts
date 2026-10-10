// Konstanta bisnis terpusat (dipakai logika & UI — jangan hardcode tersebar)
import type { StatusLaporan } from "../generated/prisma/enums";

export const JAM_OPERASIONAL = {
  mulai: "07:00",
  selesai: "20:00",
} as const;

export const DURASI_SLOT_MENIT = 30;
export const BATAS_LOGIN_GAGAL = 10;
export const JENDELA_LOGIN_MENIT = 2;
export const MASA_SESI_JAM = 12;
export const RETENSI_IDEMPOTENCY_JAM = 24;
export const BATAS_NAMA_AKUN_KARAKTER = 100;
export const BATAS_EMAIL_AKUN_KARAKTER = 254;
export const BATAS_PASSWORD_AKUN_MIN_BYTE = 8;
export const BATAS_PASSWORD_AKUN_BYTE = 72;
export const BATAS_PEMBATALAN_JAM = 24; // H-24 jam sebelum mulai (PRD Bagian 20 menggantikan H-2 TASK lama)
export const BATAS_PENGAJUAN_JAM = 336; // Pengajuan minimal H-14: waktu mulai sekurang-kurangnya 336 jam (14 hari) dari instant pengajuan (keputusan pemilik menggantikan H-1)
export const BUFFER_TANGGAL_DEFAULT_PENGAJUAN_HARI = 1; // Tambahan satu hari agar semua slot pada tanggal default lolos batas pengajuan
export const LABEL_BATAS_PENGAJUAN = "14 hari"; // Label manusiawi batas pengajuan; pesan UI memakai ini, bukan angka jam
export const PESAN_BATAS_PENGAJUAN = `Reservasi minimal ${LABEL_BATAS_PENGAJUAN} sebelum waktu mulai`;

export const BATAS_TUJUAN_MIN = 1;
export const BATAS_TUJUAN_MAX = 500;
export const BATAS_ALASAN_MAX = 500;

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

// Zona waktu tunggal aplikasi: WIB = UTC+7 tetap sepanjang tahun (tanpa DST),
// jadi offset tetap aman dipakai langsung. Jangan hardcode "Asia/Jakarta"/420
// di modul lain — impor dari sini.
export const ZONA_WAKTU = "Asia/Jakarta" as const;
export const OFFSET_ZONA_WAKTU_MENIT = 420;

// Daftar role & status (nilai aktual enum di Prisma; konstanta untuk UI/logika)
// Catatan (keputusan tim Fase 0): nilai teknis enum status memakai bahasa Inggris;
// Role & TipeFasilitas tetap bahasa Indonesia sesuai dokumen.
export const ROLE = ["pengguna", "petugas", "admin"] as const;
export const STATUS_AKUN = ["PENDING", "ACTIVE", "REJECTED", "DISABLED"] as const;
export const STATUS_RESERVASI_MENUNGGU = "PENDING" as const;
export const STATUS_RESERVASI_DISETUJUI = "APPROVED" as const;
// Status eksklusif pembatalan otomatis akibat fasilitas UNDER_MAINTENANCE (RES-09,
// REP-04); berbeda dari pembatalan petugas manual agar badge/filter/statistik
// dapat membedakannya.
export const STATUS_RESERVASI_PEMELIHARAAN = "CANCELLED_BY_MAINTENANCE" as const;
export const STATUS_RESERVASI = [
  STATUS_RESERVASI_MENUNGGU,
  STATUS_RESERVASI_DISETUJUI,
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_OFFICER",
  STATUS_RESERVASI_PEMELIHARAAN,
  "EXPIRED",
] as const;
export const STATUS_LAPORAN_BARU = "NEW" as const;
export const STATUS_LAPORAN_DIPROSES = "IN_PROGRESS" as const;
export const STATUS_LAPORAN_SELESAI = "RESOLVED" as const;
export const STATUS_LAPORAN_DITOLAK = "REJECTED" as const;
export const STATUS_LAPORAN_KERJA_PETUGAS = [STATUS_LAPORAN_BARU, STATUS_LAPORAN_DIPROSES] as const;
export const STATUS_LAPORAN_TERMINAL = [STATUS_LAPORAN_SELESAI, STATUS_LAPORAN_DITOLAK] as const;
export const STATUS_LAPORAN = [...STATUS_LAPORAN_KERJA_PETUGAS, ...STATUS_LAPORAN_TERMINAL] as const;

// Antrean laporan masuk (REP-03) hanya memuat laporan baru; daftar pekerjaan
// memuat laporan baru dan yang sedang ditangani agar pekerjaan berjalan tetap
// dapat ditemukan dan diselesaikan; riwayat memuat laporan yang sudah selesai
// atau ditolak sebagai arsip read-only.
export const STATUS_LAPORAN_ANTREAN_MASUK = [STATUS_LAPORAN_BARU] as const;
export const STATUS_LAPORAN_RIWAYAT_PETUGAS = STATUS_LAPORAN_TERMINAL;

// Matriks transisi REP-03: NEW -> IN_PROGRESS | REJECTED dan
// IN_PROGRESS -> RESOLVED | REJECTED. Status terminal tidak dapat dibuka kembali.
export const TRANSISI_STATUS_LAPORAN: Record<
  (typeof STATUS_LAPORAN_KERJA_PETUGAS)[number],
  readonly StatusLaporan[]
> = {
  [STATUS_LAPORAN_BARU]: [STATUS_LAPORAN_DIPROSES, STATUS_LAPORAN_DITOLAK],
  [STATUS_LAPORAN_DIPROSES]: [STATUS_LAPORAN_SELESAI, STATUS_LAPORAN_DITOLAK],
};

// Catatan penyelesaian wajib pada status terminal REP-03 (OpenAPI ResolutionRequest).
export const MAKS_CATATAN_RESOLUSI_LAPORAN = 500;
export const STATUS_FASILITAS = ["ACTIVE", "UNDER_MAINTENANCE", "INACTIVE"] as const;
export const TIPE_FASILITAS = ["ruang_kelas", "aula", "laboratorium", "alat", "lapangan"] as const;

// Status yang boleh dikelola lewat jalur petugas/admin REP-04; INACTIVE hanya
// lewat jalur admin FAC-05.
export const STATUS_FASILITAS_OPERASIONAL = ["ACTIVE", "UNDER_MAINTENANCE"] as const;
export type StatusFasilitasOperasional = (typeof STATUS_FASILITAS_OPERASIONAL)[number];

// Matriks transisi REP-04: ACTIVE <-> UNDER_MAINTENANCE; INACTIVE selalu ditolak.
export const TRANSISI_STATUS_FASILITAS_OPERASIONAL: Record<
  StatusFasilitasOperasional,
  StatusFasilitasOperasional
> = {
  ACTIVE: "UNDER_MAINTENANCE",
  UNDER_MAINTENANCE: "ACTIVE",
};

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
  masaBerlakuUrlUnggahMs: 10 * 60 * 1000,
  masaBerlakuUrlBacaMs: 5 * 60 * 1000,
  jendelaRateLimitMs: 60 * 60 * 1000,
  maksUnggahPerJamPengguna: 20,
  maksUnggahPerJamIp: 60,
} as const

// Batas unggah foto fasilitas admin (FAC-05): JPEG/PNG/WebP, maksimal 5 MiB.
export const FASILITAS_UPLOAD = {
  tipeDiizinkan: ["image/jpeg", "image/png", "image/webp"] as const,
  maksByte: 5 * 1024 * 1024,
  masaBerlakuUrlUnggahMs: 10 * 60 * 1000,
  masaBerlakuUrlBacaMs: 5 * 60 * 1000,
  // Redirect foto publik boleh di-cache browser sesaat supaya satu halaman
  // katalog tidak memicu satu panggilan API Blob per kartu. Wajib lebih pendek
  // dari masaBerlakuUrlBacaMs agar signed URL di cache tidak kedaluwarsa.
  masaCacheRedirectFotoDetik: 60,
} as const

// Deskripsi laporan mengikuti batas global PRD (2.000 karakter).
export const MAKS_DESKRIPSI_LAPORAN = 2000
