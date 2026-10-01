import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";

const adminFacilitySelect = {
  id: true,
  nama: true,
  tipe: true,
  lokasi: true,
  kapasitas: true,
  deskripsi: true,
  status: true,
  statusChangedAt: true,
  statusChangedBy: { select: { id: true, nama: true, role: true } },
} satisfies Prisma.FacilitySelect;

export interface AdminFacilityFilters {
  search?: string;
  type?: TipeFasilitas;
  location?: string;
  status?: StatusFasilitas;
}

export interface CreateFacilityData {
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi?: string | null;
}

/** Klausa `where` admin yang murni; tanpa filter status berarti semua status termasuk INACTIVE. */
export function buildAdminFacilityWhere(filters: AdminFacilityFilters = {}): Prisma.FacilityWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { nama: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.type ? { tipe: filters.type } : {}),
    ...(filters.location ? { lokasi: { contains: filters.location, mode: "insensitive" } } : {}),
  };
}

export interface FindAdminFacilitiesParams extends AdminFacilityFilters {
  skip: number;
  take: number;
}

export function findAdminFacilities({ skip, take, ...filters }: FindAdminFacilitiesParams) {
  return prisma.facility.findMany({
    where: buildAdminFacilityWhere(filters),
    orderBy: { id: "asc" },
    select: adminFacilitySelect,
    skip,
    take,
  });
}

export function countAdminFacilities(filters: AdminFacilityFilters = {}) {
  return prisma.facility.count({ where: buildAdminFacilityWhere(filters) });
}

export function findAdminFacilityById(id: number) {
  return prisma.facility.findUnique({ where: { id }, select: adminFacilitySelect });
}

export function createAdminFacility(data: CreateFacilityData) {
  return prisma.facility.create({ data, select: adminFacilitySelect });
}

export function updateAdminFacility(
  client: Prisma.TransactionClient,
  id: number,
  data: Prisma.FacilityUncheckedUpdateInput,
) {
  return client.facility.update({ where: { id }, data, select: adminFacilitySelect });
}
