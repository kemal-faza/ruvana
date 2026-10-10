import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";

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

export interface PublicFacilityFilters {
  search?: string;
  type?: TipeFasilitas;
  location?: string;
  minCapacity?: number;
}

/**
 * Membangun klausa `where` untuk query publik. Fungsi murni supaya bentuk
 * filternya bisa diuji tanpa database. Semua filter aktif digabung dengan logika
 * AND; fasilitas INACTIVE selalu tersaring keluar.
 */
export function buildPublicFacilityWhere(filters: PublicFacilityFilters = {}): Prisma.FacilityWhereInput {
  return {
    status: { in: PUBLIC_FACILITY_STATUSES },
    ...(filters.search ? { nama: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.type ? { tipe: filters.type } : {}),
    ...(filters.location ? { lokasi: { contains: filters.location, mode: "insensitive" } } : {}),
    ...(filters.minCapacity !== undefined ? { kapasitas: { gte: filters.minCapacity } } : {}),
  };
}

export interface FindPublicFacilitiesParams extends PublicFacilityFilters {
  skip: number;
  take: number;
}

export function findPublicFacilities({ skip, take, ...filters }: FindPublicFacilitiesParams) {
  return prisma.facility.findMany({
    where: buildPublicFacilityWhere(filters),
    orderBy: { id: "asc" },
    select: publicFacilitySelect,
    skip,
    take,
  });
}

export function countPublicFacilities(filters: PublicFacilityFilters = {}) {
  return prisma.facility.count({
    where: buildPublicFacilityWhere(filters),
  });
}

export function findPublicFacilityById(id: number) {
  return prisma.facility.findFirst({
    where: { id, status: { in: PUBLIC_FACILITY_STATUSES } },
    select: publicFacilitySelect,
  });
}

// Petugas perlu melihat provenance status terakhir (REP-04) dan mengetahui
// fasilitas INACTIVE yang tidak dapat diubahnya sendiri, jadi select petugas
// memuat seluruh status beserta aktor dan waktu perubahan.
const staffFacilitySelect = {
  ...publicFacilitySelect,
  statusChangedAt: true,
  statusChangedBy: { select: { id: true, nama: true, role: true } },
} satisfies Prisma.FacilitySelect;

/**
 * Daftar fasilitas untuk halaman status operasional petugas. Tidak dipaginasikan:
 * jumlah fasilitas pada satu kampus kecil dan petugas perlu memindai seluruh
 * status tanpa berpindah halaman.
 */
export function findStaffFacilities() {
  return prisma.facility.findMany({
    orderBy: { id: "asc" },
    select: staffFacilitySelect,
  });
}

// Untuk reservasi: perlu lock baris fasilitas agar cek konflik APPROVED tidak balapan.
export async function lockFacilityById(tx: Prisma.TransactionClient, id: number) {
  // Row lock untuk mencegah race saat cek konflik APPROVED
  await tx.$queryRaw`SELECT id FROM "facilities" WHERE id = ${id} FOR UPDATE`;
  return tx.facility.findUnique({ where: { id } });
}
