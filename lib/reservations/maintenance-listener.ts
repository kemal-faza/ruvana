import type { Prisma } from "@/generated/prisma/client";
import type { FacilityStatusChangedPayload } from "@/lib/facility-status-contract";

export const ALASAN_PERBAIKAN = "Fasilitas dalam perbaikan.";

/**
 * Listener Modul 3 atas kontrak "status fasilitas berubah" (TASK 3.7, RES-09).
 *
 * Dijalankan pemicu (TASK 4.4) di dalam transaksi yang sama, sebelum commit.
 * Idempoten: hanya baris APPROVED yang cocok yang berubah, sehingga pemicu
 * ulang tidak error dan tidak menggandakan efek.
 */
export function handleFacilityStatusChanged(
  tx: Prisma.TransactionClient,
  payload: FacilityStatusChangedPayload,
): Promise<{ count: number }> {
  if (payload.statusBaru !== "UNDER_MAINTENANCE") return Promise.resolve({ count: 0 });
  return tx.reservation.updateMany({
    // Batas eksklusif: reservasi yang mulai tepat saat perubahan sudah berjalan.
    where: { facilityId: payload.facilityId, status: "APPROVED", startTime: { gt: payload.waktu } },
    data: { status: "CANCELLED_BY_OFFICER", alasan: ALASAN_PERBAIKAN, waktuDiproses: payload.waktu },
  });
}
