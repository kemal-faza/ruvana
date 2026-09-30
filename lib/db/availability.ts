import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const approvedIntervalSelect = {
  startTime: true,
  endTime: true,
} satisfies Prisma.ReservationSelect;

/**
 * Reservasi APPROVED yang bersinggungan dengan rentang [rangeStart, rangeEnd).
 * Tidak pernah select userId/tujuanPenggunaan supaya identitas pemesan tidak bocor ke publik.
 */
export function findApprovedIntervals(facilityId: number, rangeStart: Date, rangeEnd: Date) {
  return prisma.reservation.findMany({
    where: {
      facilityId,
      status: "APPROVED",
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
    },
    select: approvedIntervalSelect,
  });
}
