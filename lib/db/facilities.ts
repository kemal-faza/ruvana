import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusFasilitas } from "@/generated/prisma/enums";

const PUBLIC_FACILITY_STATUSES: StatusFasilitas[] = ["ACTIVE", "UNDER_MAINTENANCE"];

const publicFacilitySelect = {
  id: true,
  nama: true,
  tipe: true,
  lokasi: true,
  kapasitas: true,
  deskripsi: true,
  status: true,
} satisfies Prisma.FacilitySelect;

export interface FindPublicFacilitiesParams {
  skip: number;
  take: number;
}

export function findPublicFacilities({ skip, take }: FindPublicFacilitiesParams) {
  return prisma.facility.findMany({
    where: { status: { in: PUBLIC_FACILITY_STATUSES } },
    orderBy: { id: "asc" },
    select: publicFacilitySelect,
    skip,
    take,
  });
}

export function countPublicFacilities() {
  return prisma.facility.count({
    where: { status: { in: PUBLIC_FACILITY_STATUSES } },
  });
}

export function findPublicFacilityById(id: number) {
  return prisma.facility.findFirst({
    where: { id, status: { in: PUBLIC_FACILITY_STATUSES } },
    select: publicFacilitySelect,
  });
}

// Untuk reservasi: perlu load fasilitas apapun termasuk INACTIVE untuk validasi, plus lock
export function findFacilityById(id: number) {
  return prisma.facility.findUnique({
    where: { id },
  });
}

export async function lockFacilityById(tx: Prisma.TransactionClient, id: number) {
  // Row lock untuk mencegah race saat cek konflik APPROVED
  await tx.$queryRaw`SELECT id FROM "facilities" WHERE id = ${id} FOR UPDATE`;
  return tx.facility.findUnique({ where: { id } });
}
