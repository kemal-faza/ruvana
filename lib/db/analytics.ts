import { Prisma } from "@/generated/prisma/client";
import { STATUS_RESERVASI_DISETUJUI } from "@/config/business";
import type { StatusFasilitas, StatusLaporan } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const analyticsFacilitySelect = {
  id: true,
  nama: true,
  lokasi: true,
  status: true,
} satisfies Prisma.FacilitySelect;

export interface AnalyticsFacilityRow {
  id: number;
  nama: string;
  lokasi: string;
  status: StatusFasilitas;
}

export interface SumApprovedReservationMinutesParams {
  facilityIds: number[];
  startDate: string;
  endDate: string;
}

export interface ReportAnalyticsAggregateParams {
  startAt: Date;
  endAtExclusive: Date;
  location: string | null;
}

export interface ReportAnalyticsAggregates {
  total: number;
  byFacility: Array<{ facilityId: number; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: StatusLaporan; count: number }>;
}

export function listAnalyticsFacilities(): Promise<AnalyticsFacilityRow[]> {
  return prisma.facility.findMany({ select: analyticsFacilitySelect });
}

/** Menjumlahkan durasi reservasi disetujui berdasarkan DATE kalender kampus di PostgreSQL. */
export async function sumApprovedReservationMinutes({
  facilityIds,
  startDate,
  endDate,
}: SumApprovedReservationMinutesParams): Promise<number> {
  if (facilityIds.length === 0) return 0;

  const [row] = await prisma.$queryRaw<Array<{ totalMinutes: number | null }>>`
    SELECT COALESCE(
      SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60),
      0
    )::double precision AS "totalMinutes"
    FROM "reservations"
    WHERE "facilityId" IN (${Prisma.join(facilityIds)})
      AND "status" = ${STATUS_RESERVASI_DISETUJUI}
      AND "tanggal" >= ${startDate}::date
      AND "tanggal" <= ${endDate}::date
  `;

  return Number(row?.totalMinutes ?? 0);
}

/** Menghitung laporan berdasarkan instant dibuat dan lokasi fasilitas terkait. */
export async function getReportAnalyticsAggregates({
  startAt,
  endAtExclusive,
  location,
}: ReportAnalyticsAggregateParams): Promise<ReportAnalyticsAggregates> {
  const where = {
    createdAt: { gte: startAt, lt: endAtExclusive },
    ...(location === null ? {} : { facility: { is: { lokasi: location } } }),
  } satisfies Prisma.ReportWhereInput;

  const [total, byFacility, byCategory, byStatus] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.groupBy({ by: ["facilityId"], where, _count: { _all: true } }),
    prisma.report.groupBy({ by: ["kategori"], where, _count: { _all: true } }),
    prisma.report.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);

  return {
    total,
    byFacility: byFacility.map(({ facilityId, _count }) => ({ facilityId, count: _count._all })),
    byCategory: byCategory.map(({ kategori, _count }) => ({ category: kategori, count: _count._all })),
    byStatus: byStatus.map(({ status, _count }) => ({ status, count: _count._all })),
  };
}
