// Konstanta bisnis terpusat (dipakai logika & UI — jangan hardcode tersebar)
export const JAM_OPERASIONAL = {
  mulai: "07:00",
  selesai: "20:00",
} as const;

export const DURASI_SLOT_MENIT = 30;
export const BATAS_PEMBATALAN_JAM = 2; // H-2 jam sebelum mulai

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
