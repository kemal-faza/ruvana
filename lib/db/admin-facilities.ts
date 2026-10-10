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

const archivedFacilitySelect = {
  id: true,
  nama: true,
  tipe: true,
  lokasi: true,
  kapasitas: true,
  deletedAt: true,
  deletedByNama: true,
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
    deletedAt: null,
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
  return prisma.facility.findFirst({ where: { id, deletedAt: null }, select: adminFacilitySelect });
}

/** Fasilitas yang memakai pathname foto tertentu; untuk cegah hapus blob yang masih terpakai. */
export function findFacilityByFoto(foto: string) {
  return prisma.facility.findFirst({ where: { foto }, select: { id: true } });
}

/** Nama lokasi unik untuk pilihan filter admin. */
export function findAdminFacilityLocations() {
  return prisma.facility.findMany({
    where: { lokasi: { not: "" }, deletedAt: null },
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

/** Hitung riwayat (reservasi + laporan) yang menghalangi pengarsipan fasilitas. */
export async function countFacilityHistory(client: Prisma.TransactionClient, facilityId: number) {
  const [reservations, reports] = await Promise.all([
    client.reservation.count({ where: { facilityId } }),
    client.report.count({ where: { facilityId } }),
  ]);
  return reservations + reports;
}

/** Daftar fasilitas terarsip (soft delete) untuk halaman riwayat admin. */
export function findArchivedFacilities(take: number) {
  return prisma.facility.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take,
    select: archivedFacilitySelect,
  });
}

export function archiveAdminFacility(
  client: Prisma.TransactionClient,
  id: number,
  data: { deletedAt: Date; deletedById: number; deletedByNama: string },
) {
  return client.facility.update({
    where: { id },
    data: { deletedAt: data.deletedAt, deletedById: data.deletedById, deletedByNama: data.deletedByNama },
    select: { id: true },
  });
}

export function restoreAdminFacility(client: Prisma.TransactionClient, id: number) {
  return client.facility.update({
    where: { id },
    data: { deletedAt: null, deletedById: null, deletedByNama: null },
    select: { id: true },
  });
}
