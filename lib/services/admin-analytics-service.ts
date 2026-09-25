import { JAM_OPERASIONAL, JAKARTA_TIMEZONE, STATUS_FASILITAS } from "@/config/business";
import { LABEL_STATUS_LAPORAN } from "@/config/labels";
import {
  getReportAnalyticsAggregates,
  listAnalyticsFacilities,
  sumApprovedReservationMinutes,
} from "@/lib/db/analytics";
import type { StatusFasilitas, StatusLaporan } from "@/generated/prisma/enums";
import type { ProblemFieldError } from "@/lib/http/problem";
import { getJakartaAnalyticsDateRange } from "@/lib/time/analytics-date-range";
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

export interface AnalyticsReportSummary {
  total: number;
  byFacility: Array<{ facilityId: number; label: string; count: number }>;
  byCategory: Array<{ label: string; count: number }>;
  byStatus: Array<{ status: StatusLaporan; label: string; count: number }>;
}

export interface AnalyticsSnapshot {
  filters: AnalyticsFilters;
  locations: string[];
  metadata: { generatedAt: Date };
  occupancy: AnalyticsOccupancy;
  reports: AnalyticsReportSummary;
  facilityStatuses: Record<StatusFasilitas, string[]>;
  methodology: {
    timezone: typeof JAKARTA_TIMEZONE;
    minutesPerDay: number;
    capacityFormula: string;
    occupancyFormula: string;
    reservationDateRule: string;
    approvedStatusRule: string;
    reportCreationDateRule: string;
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
  const generatedAt = new Date();
  const { startAt, endAtExclusive } = getJakartaAnalyticsDateRange(filters.startDate, filters.endDate);
  const [totalApprovedMinutes, reportAggregates] = await Promise.all([
    facilityIds.length === 0
      ? Promise.resolve(0)
      : sumApprovedReservationMinutes({
          facilityIds,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
    getReportAnalyticsAggregates({ startAt, endAtExclusive, location: filters.location }),
  ]);
  const facilityNameById = new Map(facilitiesInScope.map(({ id, nama }) => [id, nama]));
  const reports: AnalyticsReportSummary = {
    total: reportAggregates.total,
    byFacility: reportAggregates.byFacility
      .map(({ facilityId, count }) => ({
        facilityId,
        label: facilityNameById.get(facilityId) ?? `Fasilitas ${facilityId}`,
        count,
      }))
      .sort((a, b) => b.count - a.count || compareIndonesian(a.label, b.label)),
    byCategory: reportAggregates.byCategory
      .map(({ category, count }) => ({ label: category, count }))
      .sort((a, b) => b.count - a.count || compareIndonesian(a.label, b.label)),
    byStatus: reportAggregates.byStatus
      .map(({ status, count }) => ({ status, label: LABEL_STATUS_LAPORAN[status], count }))
      .sort((a, b) => b.count - a.count || compareIndonesian(a.label, b.label)),
  };

  return {
    ok: true,
    data: {
      filters,
      locations,
      metadata: { generatedAt },
      occupancy: {
        facilityCount: facilitiesInScope.length,
        dayCount,
        totalApprovedMinutes,
        capacityMinutes,
        occupancyPercent: capacityMinutes > 0 ? (totalApprovedMinutes / capacityMinutes) * 100 : null,
        unavailableReason:
          capacityMinutes > 0 ? null : "Tidak ada fasilitas yang cocok dengan lokasi ini, sehingga kapasitas periode sama dengan nol.",
      },
      reports,
      facilityStatuses,
      methodology: {
        timezone: JAKARTA_TIMEZONE,
        minutesPerDay: MINUTES_PER_DAY,
        capacityFormula: "Jumlah fasilitas × jumlah hari kalender inklusif × menit operasional per hari.",
        occupancyFormula: "Total menit reservasi APPROVED ÷ kapasitas periode × 100%.",
        reservationDateRule: "Reservasi dihitung berdasarkan tanggal kalender kampus (Asia/Jakarta) dalam rentang inklusif.",
        approvedStatusRule: "Hanya durasi reservasi berstatus APPROVED yang masuk ke pembilang.",
        reportCreationDateRule:
          "Laporan dihitung berdasarkan waktu dibuat dalam rentang tanggal kalender Asia/Jakarta, dengan batas akhir eksklusif pada pukul 00.00 hari berikutnya.",
        facilityStatusNote:
          "Status fasilitas adalah snapshot saat ini. Histori status belum tersedia; fasilitas dalam perbaikan dan nonaktif tetap masuk kapasitas.",
      },
    },
  };
}
