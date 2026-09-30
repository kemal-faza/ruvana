import { ZONA_WAKTU } from "@/config/business";
import { computeAvailability, type FacilityAvailability } from "@/lib/availability/slots";
import { findApprovedIntervals } from "@/lib/db/availability";
import { findPublicFacilityById } from "@/lib/db/facilities";
import { jakartaDayRangeUtc, parseCalendarDate } from "@/lib/time/jakarta";

/**
 * DTO endpoint publik. Tipe ketersediaan ini sama dengan yang dipakai jalur
 * reservasi (lib/reservations/availability.ts) — satu mesin, bukan dua.
 */
export type AvailabilityResponse = FacilityAvailability;

/**
 * date wajib sudah tervalidasi (lib/validation/facility-query.ts#parseAvailabilityDate)
 * sebelum sampai di sini. Fasilitas INACTIVE/tidak ada -> null (404 identik dengan detail).
 */
export async function getFacilityAvailability(facilityId: number, date: string): Promise<AvailabilityResponse | null> {
  const facility = await findPublicFacilityById(facilityId);
  if (!facility) return null;

  const calendarDate = parseCalendarDate(date);
  if (!calendarDate) return null;

  if (facility.status === "UNDER_MAINTENANCE") {
    const slots = computeAvailability({ date: calendarDate, status: "UNDER_MAINTENANCE", approvedIntervals: [] });
    return { facilityId, date, timezone: ZONA_WAKTU, slots };
  }

  const { start, end } = jakartaDayRangeUtc(calendarDate);
  const approvedIntervals = await findApprovedIntervals(facilityId, start, end);
  const slots = computeAvailability({ date: calendarDate, status: "ACTIVE", approvedIntervals });

  return { facilityId, date, timezone: ZONA_WAKTU, slots };
}
