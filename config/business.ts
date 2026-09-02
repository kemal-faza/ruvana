// Konstanta bisnis terpusat (dipakai logika & UI — jangan hardcode tersebar)
export const JAM_OPERASIONAL = {
  mulai: "07:00",
  selesai: "20:00",
} as const;

export const DURASI_SLOT_MENIT = 30;
export const BATAS_PEMBATALAN_JAM = 2; // H-2 jam sebelum mulai

// Daftar role & status (nilai aktual enum di Prisma; konstanta untuk UI/logika)
export const ROLE = ["pengguna", "petugas", "admin"] as const;
export const STATUS_AKUN = ["pending", "aktif", "ditolak", "dinonaktifkan"] as const;
export const STATUS_RESERVASI = [
  "menunggu",
  "disetujui",
  "ditolak",
  "dibatalkan_oleh_pengguna",
  "dibatalkan_oleh_petugas",
  "kedaluwarsa",
] as const;
export const STATUS_LAPORAN = ["baru", "diproses", "selesai", "ditolak"] as const;
export const STATUS_FASILITAS = ["aktif", "dalam_perbaikan", "nonaktif"] as const;
export const TIPE_FASILITAS = ["ruang_kelas", "aula", "laboratorium", "alat", "lapangan"] as const;
