import type { StatusFasilitas, StatusReservasi, TipeFasilitas } from "../generated/prisma/enums";

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

// Label Indonesia untuk status reservasi; nilai enum tetap bahasa Inggris-teknis.
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
};
