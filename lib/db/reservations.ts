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

export interface ListMyReservationsParams {
  userId: number;
  status?: StatusReservasi;
  skip: number;
  take: number;
}

function myReservationsWhere(userId: number, status?: StatusReservasi) {
  return { userId, ...(status ? { status } : {}) };
}

// Riwayat milik pengguna: urutan deterministik createdAt DESC lalu id DESC.
// Ownership dijaga lewat filter userId di setiap query.
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

// Detail milik pengguna: findFirst dengan (id, userId) agar reservasi
// milik pengguna lain termasking sebagai null (→ 404 di route).
export function findMyReservationById(userId: number, id: number) {
  return prisma.reservation.findFirst({
    where: { id, userId },
    include: { facility: true },
  });
}

// Antrian petugas: PENDING saja, FIFO agar yang paling lama menunggu diproses dulu.
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

// Daftar APPROVED untuk pembatalan mendesak (TASK 3.5): urut waktu mulai
// terdekat agar reservasi yang paling segera terdampak mudah ditemukan.
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
