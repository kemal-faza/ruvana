import type { StatusFasilitas, TipeFasilitas } from "../generated/prisma/enums";

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

export const LABEL_STATUS_SLOT = {
  available: "Tersedia",
  blockedApproved: "Tidak tersedia",
  blockedMaintenance: "Tidak tersedia (perbaikan)",
} as const;
