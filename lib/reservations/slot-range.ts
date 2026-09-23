// Helper murni untuk dropdown Jam mulai / Jam selesai.
// Sengaja tanpa dependensi Prisma/query agar aman diimpor Client Component.
// Aturan bisnis yang dijaga di sini:
// - Hanya APPROVED (dan MAINTENANCE) yang menandai slot tidak tersedia.
// - Jam selesai harus setelah jam mulai dan seluruh slot 30-menit di antaranya
//   berstatus tersedia (tidak boleh lompat melewati slot yang tidak tersedia).

import { VALID_END_TIMES, VALID_START_TIMES } from "@/config/business";

export type AvailabilityBlockedBy = "APPROVED" | "MAINTENANCE";

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
  blockedBy: AvailabilityBlockedBy | null;
}

export interface FacilityAvailability {
  facilityId: number;
  date: string;
  timezone: "Asia/Jakarta";
  slots: AvailabilitySlot[];
}

export function blockedByLabel(blockedBy: AvailabilityBlockedBy | null): string | null {
  if (blockedBy === "APPROVED") return "sudah disetujui";
  if (blockedBy === "MAINTENANCE") return "dalam perbaikan";
  return null;
}

/**
 * Daftar jam selesai yang valid untuk sebuah jam mulai:
 * hanya waktu setelah jam mulai yang seluruh slot 30-menit di antaranya
 * tersedia. Berhenti di slot tidak tersedia pertama (tidak boleh lompat).
 *
 * Jika `slots` null (ketersediaan tidak diketahui, mis. gagal dimuat),
 * kembalikan semua waktu selesai setelah jam mulai — server tetap
 * memvalidasi dan menolak saat submit.
 */
export function getValidEndTimes(
  startTime: string,
  slots: readonly AvailabilitySlot[] | null,
): string[] {
  if (!startTime) return [];
  if (slots === null) {
    return (VALID_END_TIMES as readonly string[]).filter((t) => t > startTime);
  }
  const idx = slots.findIndex((s) => s.startTime === startTime);
  if (idx < 0 || !slots[idx]?.available) return [];
  const result: string[] = [];
  for (let i = idx; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot || !slot.available) break;
    result.push(slot.endTime);
  }
  return result;
}

/** Daftar waktu mulai yang valid — representasi ulang VALID_START_TIMES. */
export function getStartTimeOptions(): string[] {
  return [...(VALID_START_TIMES as readonly string[])];
}
