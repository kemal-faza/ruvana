import { ZONA_WAKTU } from "@/config/business";
import { computeAvailability, type FacilityAvailability } from "@/lib/availability/slots";
import { findApprovedIntervals, type AvailabilityDbClient } from "@/lib/db/availability";
import { prisma } from "@/lib/prisma";
import type { StatusFasilitas } from "@/generated/prisma/enums";
import { jakartaDayRangeUtc, parseCalendarDate } from "@/lib/time/jakarta";

export type AvailabilityClient = AvailabilityDbClient;

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
 * Ketersediaan 26 slot untuk satu fasilitas pada satu tanggal kalender
 * Asia/Jakarta. Mesin dan tipe hasilnya sama dengan jalur publik
 * (lib/availability/slots.ts + lib/db/availability.ts): hanya reservasi
 * APPROVED yang memblokir, PENDING tidak dianggap konflik, dan
 * UNDER_MAINTENANCE membuat seluruh slot tidak tersedia.
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

  const calendarDate = parseCalendarDate(date);
  if (!calendarDate) return null;

  const client = options.client ?? prisma;

  let status = options.facilityStatus;
  if (status === undefined) {
    const facility = await client.facility.findUnique({ where: { id: facilityId } });
    if (!facility || facility.status === "INACTIVE") return null;
    status = facility.status;
  }
  if (status === "INACTIVE") return null;

  const { start, end } = jakartaDayRangeUtc(calendarDate);
  const approvedIntervals =
    status === "UNDER_MAINTENANCE" ? [] : await findApprovedIntervals(facilityId, start, end, client);
  const slots = computeAvailability({ date: calendarDate, status, approvedIntervals });

  return { facilityId, date, timezone: ZONA_WAKTU, slots };
}
