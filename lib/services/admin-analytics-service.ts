import { JAM_OPERASIONAL, JAKARTA_TIMEZONE, STATUS_FASILITAS } from "@/config/business";
import { listAnalyticsFacilities, sumApprovedReservationMinutes } from "@/lib/db/analytics";
import type { StatusFasilitas } from "@/generated/prisma/enums";
import type { ProblemFieldError } from "@/lib/http/problem";
import { parseTimeToMinutes } from "@/lib/time/reservation-time";
import type { AnalyticsFilters } from "@/lib/validation/admin-analytics";

const MINUTES_PER_DAY = parseTimeToMinutes(JAM_OPERASIONAL.selesai) - parseTimeToMinutes(JAM_OPERASIONAL.mulai);
const FACILITY_STATUS_ORDER = STATUS_FASILITAS satisfies readonly StatusFasilitas[];

export interface AnalyticsOccupancy {
  facilityCount: number;
  dayCount: number;
  totalApprovedMinutes: number;
  capacityMinutes: number;
  occupancyPercent: number | null;
  unavailableReason: string | null;
}

export interface AnalyticsSnapshot {
  filters: AnalyticsFilters;
  locations: string[];
  occupancy: AnalyticsOccupancy;
  facilityStatuses: Record<StatusFasilitas, string[]>;
  methodology: {
    timezone: typeof JAKARTA_TIMEZONE;
    minutesPerDay: number;
    capacityFormula: string;
    occupancyFormula: string;
    reservationDateRule: string;
    approvedStatusRule: string;
    facilityStatusNote: string;
  };
}

export type AnalyticsSnapshotResult =
  | { ok: true; data: AnalyticsSnapshot }
  | { ok: false; errors: ProblemFieldError[]; locations: string[] };

function compareIndonesian(a: string, b: string): number {
  return a.localeCompare(b, "id", { sensitivity: "base" }) || a.localeCompare(b, "id");
}

function locationNames(facilities: readonly { lokasi: string }[]): string[] {
  return [...new Set(facilities.map((facility) => facility.lokasi))].sort(compareIndonesian);
}

export async function getAnalyticsLocations(): Promise<string[]> {
  return locationNames(await listAnalyticsFacilities());
}

function countCalendarDays(startDate: string, endDate: string): number {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  return (Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) /
    (24 * 60 * 60 * 1000) +
    1;
}

/**
 * Sumber snapshot tunggal untuk dashboard analitik dan exporter berikutnya.
 * Filter harus sudah divalidasi sebelum snapshot diminta.
 */
export async function getAnalyticsSnapshot(filters: AnalyticsFilters): Promise<AnalyticsSnapshotResult> {
  const facilities = await listAnalyticsFacilities();
  const locations = locationNames(facilities);

  if (filters.location !== null && !locations.includes(filters.location)) {
    return {
      ok: false,
      errors: [
        {
          field: "location",
          code: "UNKNOWN_LOCATION",
          message: "Pilih lokasi yang tersedia atau Semua lokasi.",
        },
      ],
      locations,
    };
  }

  const facilitiesInScope = facilities
    .filter((facility) => filters.location === null || facility.lokasi === filters.location)
    .sort((a, b) => compareIndonesian(a.nama, b.nama));
  const facilityStatuses = Object.fromEntries(
    FACILITY_STATUS_ORDER.map((status) => [status, [] as string[]]),
  ) as Record<StatusFasilitas, string[]>;

  for (const facility of facilitiesInScope) {
    facilityStatuses[facility.status].push(facility.nama);
  }

  const dayCount = countCalendarDays(filters.startDate, filters.endDate);
  const capacityMinutes = facilitiesInScope.length * dayCount * MINUTES_PER_DAY;
  const facilityIds = facilitiesInScope.map((facility) => facility.id);
  const totalApprovedMinutes =
    facilityIds.length === 0
      ? 0
      : await sumApprovedReservationMinutes({
          facilityIds,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });

  return {
    ok: true,
    data: {
      filters,
      locations,
      occupancy: {
        facilityCount: facilitiesInScope.length,
        dayCount,
        totalApprovedMinutes,
        capacityMinutes,
        occupancyPercent: capacityMinutes > 0 ? (totalApprovedMinutes / capacityMinutes) * 100 : null,
        unavailableReason:
          capacityMinutes > 0 ? null : "Tidak ada fasilitas yang cocok dengan lokasi ini, sehingga kapasitas periode sama dengan nol.",
      },
      facilityStatuses,
      methodology: {
        timezone: JAKARTA_TIMEZONE,
        minutesPerDay: MINUTES_PER_DAY,
        capacityFormula: "Jumlah fasilitas × jumlah hari kalender inklusif × menit operasional per hari.",
        occupancyFormula: "Total menit reservasi APPROVED ÷ kapasitas periode × 100%.",
        reservationDateRule: "Reservasi dihitung berdasarkan tanggal kalender kampus (Asia/Jakarta) dalam rentang inklusif.",
        approvedStatusRule: "Hanya durasi reservasi berstatus APPROVED yang masuk ke pembilang.",
        facilityStatusNote:
          "Status fasilitas adalah snapshot saat ini. Histori status belum tersedia; fasilitas dalam perbaikan dan nonaktif tetap masuk kapasitas.",
      },
    },
  };
}
