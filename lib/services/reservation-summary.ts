// Ringkasan reservasi untuk dashboard petugas (RES-10).
// Controller: memakai singleton Prisma dan expiry idempoten yang sudah ada.
// "Sedang berlangsung" adalah indikator turunan (mulai <= sekarang < selesai),
// bukan status baru. View hanya menerima angka siap tampil dari service ini.
import { prisma } from "@/lib/prisma";
import { expirePendingReservations } from "@/lib/reservations/expiry";

export interface StaffReservationSummary {
  menunggu: number;
  disetujui: number;
  sedangBerlangsung: number;
  ditolak: number;
  lainnya: number;
  total: number;
}

// Batas inklusif di awal (mulai <= sekarang) dan eksklusif di akhir
// (sekarang < selesai): reservasi tepat mulai sudah berlangsung, tepat
// selesai sudah tidak berlangsung.
export function sedangBerlangsung(mulai: Date, selesai: Date, sekarang: Date): boolean {
  return mulai.getTime() <= sekarang.getTime() && sekarang.getTime() < selesai.getTime();
}

export async function getStaffReservationSummaryService(
  sekarang: Date = new Date(),
): Promise<StaffReservationSummary> {
  // Expiry idempoten dulu agar PENDING yang sudah lewat tidak terhitung
  // sebagai Menunggu (RES-08, RES-10).
  await expirePendingReservations(prisma, sekarang);

  const [menunggu, disetujui, berlangsung, ditolak, lainnya] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({ where: { status: "APPROVED" } }),
    prisma.reservation.count({
      where: {
        status: "APPROVED",
        startTime: { lte: sekarang },
        endTime: { gt: sekarang },
      },
    }),
    prisma.reservation.count({ where: { status: "REJECTED" } }),
    prisma.reservation.count({
      where: { status: { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OFFICER", "CANCELLED_BY_MAINTENANCE", "EXPIRED"] } },
    }),
  ]);

  return {
    menunggu,
    disetujui,
    sedangBerlangsung: berlangsung,
    ditolak,
    lainnya,
    total: menunggu + disetujui + ditolak + lainnya,
  };
}
