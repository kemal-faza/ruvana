import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Alasan otomatis yang terlihat pemilik di riwayat/detail. Nilai ini bagian
// dari kontrak tampilan (lihat contoh EXPIRED di docs/api/openapi.yaml).
export const ALASAN_KEDALUWARSA = "Reservasi kedaluwarsa sebelum diproses.";

export type ExpiryClient = Prisma.TransactionClient | typeof prisma;

/**
 * Mengubah reservasi PENDING yang waktu mulainya sudah lewat menjadi EXPIRED.
 *
 * Idempoten: query hanya menyentuh baris PENDING, sehingga eksekusi berulang
 * menghasilkan keadaan akhir yang sama tanpa efek samping tambahan. Batasnya
 * adalah serverNow >= startsAt (startTime lte now), konsisten dengan aturan
 * penolakan slot-tepat-waktu-saat-pengajuan.
 *
 * Dipanggil sebelum pembacaan antrean petugas dan saat operasi reservasi
 * terkait (lazy expiry — berlaku di semua lingkungan termasuk lokal dan
 * test), dilengkapi cron production agar baris basi tidak menumpuk di DB.
 */
export function expirePendingReservations(client: ExpiryClient = prisma, now: Date = new Date()) {
  return client.reservation.updateMany({
    where: { status: "PENDING", startTime: { lte: now } },
    data: { status: "EXPIRED", alasan: ALASAN_KEDALUWARSA, waktuDiproses: now },
  });
}
