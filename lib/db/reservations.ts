import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { asiaJakartaToUtc } from "@/lib/time/reservation-time";

export interface FindOverlappingApprovedParams {
  facilityId: number;
  startsAt: Date;
  endsAt: Date;
}

export function findOverlappingApproved(
  tx: Prisma.TransactionClient,
  { facilityId, startsAt, endsAt }: FindOverlappingApprovedParams,
) {
  return tx.reservation.findMany({
    where: {
      facilityId,
      status: "APPROVED",
      // overlap: existing.startTime < new.endsAt && existing.endTime > new.startsAt
      startTime: { lt: endsAt },
      endTime: { gt: startsAt },
    },
    select: { id: true, startTime: true, endTime: true },
  });
}

export function findApprovedByFacilityAndDate(
  txOrPrisma: Prisma.TransactionClient | typeof prisma,
  facilityId: number,
  dateStr: string,
) {
  const from: Date = asiaJakartaToUtc(dateStr, "00:00");
  const until = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return (txOrPrisma as Prisma.TransactionClient).reservation.findMany({
    where: {
      facilityId,
      status: "APPROVED",
      tanggal: { gte: from, lt: until },
    },
    select: { startTime: true, endTime: true },
  });
}

export function createReservation(
  tx: Prisma.TransactionClient,
  data: {
    userId: number;
    facilityId: number;
    tanggal: Date;
    startTime: Date;
    endTime: Date;
    tujuanPenggunaan: string;
  },
) {
  return tx.reservation.create({
    data: {
      userId: data.userId,
      facilityId: data.facilityId,
      tanggal: data.tanggal,
      startTime: data.startTime,
      endTime: data.endTime,
      tujuanPenggunaan: data.tujuanPenggunaan,
      status: "PENDING",
    },
    include: { facility: true },
  });
}
