// Perhitungan ketersediaan internal — SATU-SATUNYA sumber logic pemetaan slot.
// INI BUKAN endpoint API publik: dipanggil dari Server Component
// (app/reservasi/page.tsx) dan dari reservation-service saat membangun
// payload 409 RESERVATION_OVERLAP. Endpoint availability publik tetap
// ranah Modul 2.

import type { Prisma } from "@/generated/prisma/client";
import type { StatusFasilitas } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  asiaJakartaToUtc,
  generateAllSlots,
  isValidDateFormat,
} from "@/lib/time/reservation-time";
import type { AvailabilityBlockedBy, FacilityAvailability } from "./slot-range";

export type AvailabilityClient = Prisma.TransactionClient | typeof prisma;

export interface ComputeAvailabilityOptions {
  /**
   * Client Prisma/transaksi. Default ke singleton biasa; isi dengan `tx`
   * saat dipanggil dari dalam `prisma.$transaction()` agar bacaan konsisten
   * dengan row lock yang sedang dipegang.
   */
  client?: AvailabilityClient;
  /**
   * Status fasilitas yang sudah diketahui. Kalau diberikan, status TIDAK
   * di-query ulang dari DB (penting di dalam transaksi: status sudah dibaca
   * lewat SELECT ... FOR UPDATE sebelumnya; baca ulang di luar lock
   * berisiko basi/tidak konsisten).
   */
  facilityStatus?: StatusFasilitas;
}

/**
 * Hitung ketersediaan 26 slot untuk satu fasilitas pada satu tanggal
 * kalender Asia/Jakarta. Hanya reservasi APPROVED yang memblokir;
 * PENDING tidak dianggap konflik. Fasilitas UNDER_MAINTENANCE membuat
 * seluruh slot tidak tersedia (blockedBy MAINTENANCE).
 *
 * Mengembalikan null bila masukan tidak valid atau fasilitas tidak
 * ditemukan / INACTIVE (dimasking seperti data hilang) — pemanggil
 * menampilkan semua opsi aktif dan mengandalkan validasi server
 * saat submit.
 */
export async function computeFacilityAvailability(
  facilityId: number,
  date: string,
  options: ComputeAvailabilityOptions = {},
): Promise<FacilityAvailability | null> {
  if (!Number.isInteger(facilityId) || facilityId < 1) return null;
  if (!isValidDateFormat(date)) return null;

  const client = options.client ?? prisma;

  let status = options.facilityStatus;
  if (status === undefined) {
    const facility = await client.facility.findUnique({ where: { id: facilityId } });
    if (!facility || facility.status === "INACTIVE") return null;
    status = facility.status;
  }
  if (status === "INACTIVE") return null;

  const allSlots = generateAllSlots();

  if (status === "UNDER_MAINTENANCE") {
    const blockedBy: AvailabilityBlockedBy = "MAINTENANCE";
    return {
      facilityId,
      date,
      timezone: "Asia/Jakarta",
      slots: allSlots.map((slot) => ({ ...slot, available: false, blockedBy })),
    };
  }

  const dayStart = asiaJakartaToUtc(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const approved = await client.reservation.findMany({
    where: {
      facilityId,
      status: "APPROVED",
      tanggal: { gte: dayStart, lt: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const slots = allSlots.map((slot) => {
    const slotStart = asiaJakartaToUtc(date, slot.startTime);
    const slotEnd = asiaJakartaToUtc(date, slot.endTime);
    const blocked = approved.some((r) => r.startTime < slotEnd && r.endTime > slotStart);
    return {
      ...slot,
      available: !blocked,
      blockedBy: blocked ? ("APPROVED" as const) : null,
    };
  });

  return { facilityId, date, timezone: "Asia/Jakarta", slots };
}
