import { Prisma } from "@/generated/prisma/client";
import { STATUS_RESERVASI_DISETUJUI } from "@/config/business";
import type { StatusFasilitas } from "@/generated/prisma/enums";
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

export function listAnalyticsFacilities(): Promise<AnalyticsFacilityRow[]> {
  return prisma.facility.findMany({ select: analyticsFacilitySelect });
}

/** Aggregate all approved duration minutes by campus calendar DATE in PostgreSQL. */
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
