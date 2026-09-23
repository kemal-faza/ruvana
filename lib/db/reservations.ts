import type { Prisma } from "@/generated/prisma/client";
import type { StatusReservasi } from "@/generated/prisma/enums";
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

export interface ListMyReservationsParams {
  userId: number;
  status?: StatusReservasi;
  skip: number;
  take: number;
}

function myReservationsWhere(userId: number, status?: StatusReservasi) {
  return { userId, ...(status ? { status } : {}) };
}

export function listMyReservations({ userId, status, skip, take }: ListMyReservationsParams) {
  return prisma.reservation.findMany({
    where: myReservationsWhere(userId, status),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { facility: true },
    skip,
    take,
  });
}

export function countMyReservations({ userId, status }: Omit<ListMyReservationsParams, "skip" | "take">) {
  return prisma.reservation.count({
    where: myReservationsWhere(userId, status),
  });
}

export function findMyReservationById(userId: number, id: number) {
  return prisma.reservation.findFirst({
    where: { id, userId },
    include: { facility: true },
  });
}

export function listPendingQueue({ skip, take }: { skip: number; take: number }) {
  return prisma.reservation.findMany({
    where: { status: "PENDING" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { facility: true, user: true },
    skip,
    take,
  });
}

export function countPendingQueue() {
  return prisma.reservation.count({
    where: { status: "PENDING" },
  });
}

export function listApprovedQueue({ skip, take }: { skip: number; take: number }) {
  return prisma.reservation.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    include: { facility: true, user: true },
    skip,
    take,
  });
}

export function countApprovedQueue() {
  return prisma.reservation.count({
    where: { status: "APPROVED" },
  });
}
