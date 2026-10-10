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
  foto: true,
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
  foto?: string | null;
  fotoContentType?: string | null;
  fotoSize?: number | null;
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

/** Fasilitas yang memakai pathname foto tertentu; untuk cegah hapus blob yang masih terpakai. */
export function findFacilityByFoto(foto: string) {
  return prisma.facility.findFirst({ where: { foto }, select: { id: true } });
}

/** Nama lokasi unik untuk pilihan filter admin. */
export function findAdminFacilityLocations() {
  return prisma.facility.findMany({
    where: { lokasi: { not: "" } },
    select: { lokasi: true },
    distinct: ["lokasi"],
    orderBy: { lokasi: "asc" },
  });
}

export function createAdminFacility(client: Prisma.TransactionClient, data: CreateFacilityData) {
  return client.facility.create({ data, select: adminFacilitySelect });
}

export function updateAdminFacility(
  client: Prisma.TransactionClient,
  id: number,
  data: Prisma.FacilityUncheckedUpdateInput,
) {
  return client.facility.update({ where: { id }, data, select: adminFacilitySelect });
}

/** Hitung riwayat (reservasi + laporan) yang menghalangi hapus fisik fasilitas. */
export async function countFacilityHistory(client: Prisma.TransactionClient, facilityId: number) {
  const [reservations, reports] = await Promise.all([
    client.reservation.count({ where: { facilityId } }),
    client.report.count({ where: { facilityId } }),
  ]);
  return reservations + reports;
}

export function deleteAdminFacility(client: Prisma.TransactionClient, id: number) {
  return client.facility.delete({ where: { id }, select: { id: true, foto: true } });
}
