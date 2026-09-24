import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusLaporan } from "@/generated/prisma/enums";

const reportFacilitySelect = {
  id: true,
  nama: true,
  tipe: true,
  lokasi: true,
  kapasitas: true,
  status: true,
} satisfies Prisma.FacilitySelect;

const reportUserSelect = {
  id: true,
  nama: true,
  role: true,
} satisfies Prisma.UserSelect;

const reportSelect = {
  id: true,
  facilityId: true,
  kategori: true,
  deskripsi: true,
  foto: true,
  status: true,
  catatanResolusi: true,
  ditanganiOleh: true,
  createdAt: true,
  updatedAt: true,
  facility: { select: reportFacilitySelect },
} satisfies Prisma.ReportSelect;

export type ReportWithFacility = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

export interface FindReportsByUserParams {
  userId: number;
  status?: StatusLaporan;
  skip: number;
  take: number;
}

export function findReportsByUser({ userId, status, skip, take }: FindReportsByUserParams) {
  return prisma.report.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: reportSelect,
    skip,
    take,
  });
}

export function countReportsByUser(userId: number, status?: StatusLaporan) {
  return prisma.report.count({
    where: { userId, ...(status ? { status } : {}) },
  });
}

export function findUsersById(ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({ where: { id: { in: ids } }, select: reportUserSelect });
}

export function findFacilityById(id: number) {
  return prisma.facility.findFirst({ where: { id }, select: reportFacilitySelect });
}

export function createReport(data: {
  userId: number;
  facilityId: number;
  kategori: string;
  deskripsi: string;
  foto: string | null;
}) {
  return prisma.report.create({
    data,
    select: reportSelect,
  });
}

/** Opsi fasilitas untuk form laporan: fasilitas yang masih terlihat publik (ACTIVE / UNDER_MAINTENANCE). */
export function findReportFacilityOptions() {
  return prisma.facility.findMany({
    where: { status: { in: ["ACTIVE", "UNDER_MAINTENANCE"] } },
    orderBy: { nama: "asc" },
    select: reportFacilitySelect,
  });
}

/**
 * Stand-in sementara untuk seam sesi Modul Identity & Account (belum terimplementasi).
 * Laporan "milik pengguna" di-resolve ke akun demo pengguna aktif pertama sampai seam sesi tersedia.
 */
export function findDefaultReportOwner() {
  return prisma.user.findFirst({
    where: { role: "pengguna", status: "ACTIVE" },
    orderBy: { id: "asc" },
    select: { id: true, nama: true },
  });
}