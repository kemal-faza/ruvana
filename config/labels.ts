<<<<<<< HEAD
import type { StatusFasilitas, StatusReservasi, TipeFasilitas } from "../generated/prisma/enums";
=======
import type { StatusFasilitas, StatusLaporan, TipeFasilitas } from "../generated/prisma/enums";
>>>>>>> 68b9fd958714abbff4db9d833f3d224826ef4dfa

export const LABEL_TIPE_FASILITAS: Record<TipeFasilitas, string> = {
  ruang_kelas: "Ruang kelas",
  aula: "Aula",
  laboratorium: "Laboratorium",
  alat: "Alat",
  lapangan: "Lapangan",
};

export const LABEL_SATUAN_KAPASITAS: Record<TipeFasilitas, string> = {
  ruang_kelas: "orang",
  aula: "orang",
  laboratorium: "orang",
  alat: "unit",
  lapangan: "orang",
};

export const LABEL_STATUS_FASILITAS: Record<StatusFasilitas, string> = {
  ACTIVE: "Tersedia",
  UNDER_MAINTENANCE: "Dalam Perbaikan",
  INACTIVE: "Nonaktif",
};

export const BADGE_STATUS_FASILITAS: Record<StatusFasilitas, "success" | "pending" | "neutral"> = {
  ACTIVE: "success",
  UNDER_MAINTENANCE: "pending",
  INACTIVE: "neutral",
};

<<<<<<< HEAD
export const LABEL_STATUS_RESERVASI: Record<StatusReservasi, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED_BY_USER: "Dibatalkan pengguna",
  CANCELLED_BY_OFFICER: "Dibatalkan petugas",
  EXPIRED: "Kedaluwarsa",
};

export const BADGE_STATUS_RESERVASI: Record<
  StatusReservasi,
  "success" | "pending" | "neutral" | "destructive" | "outline"
> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED_BY_USER: "neutral",
  CANCELLED_BY_OFFICER: "neutral",
  EXPIRED: "outline",
=======
export const LABEL_STATUS_LAPORAN: Record<StatusLaporan, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

export const BADGE_STATUS_LAPORAN: Record<
  StatusLaporan,
  "pending" | "info" | "success" | "danger"
> = {
  NEW: "pending",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  REJECTED: "danger",
>>>>>>> 68b9fd958714abbff4db9d833f3d224826ef4dfa
};
