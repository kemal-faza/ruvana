import type { PublicFacilityFilters } from "@/lib/db/facilities";
import { countPublicFacilities, findPublicFacilities, findPublicFacilityById, findStaffFacilities } from "@/lib/db/facilities";
import type { Role, StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";

export interface PublicFacility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: "ACTIVE" | "UNDER_MAINTENANCE";
}

export interface PageMeta {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PublicFacilityCollection {
  items: PublicFacility[];
  meta: PageMeta;
}

export interface PublicFacilityListQuery extends PublicFacilityFilters {
  page: number;
  perPage: number;
}

export async function listPublicFacilities({ page, perPage, ...filters }: PublicFacilityListQuery): Promise<PublicFacilityCollection> {
  const skip = (page - 1) * perPage;

  const [items, totalItems] = await Promise.all([
    findPublicFacilities({ skip, take: perPage, ...filters }),
    countPublicFacilities(filters),
  ]);

  return {
    items: items as PublicFacility[],
    meta: {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    },
  };
}

export async function getPublicFacility(id: number): Promise<PublicFacility | null> {
  const facility = await findPublicFacilityById(id);
  return facility as PublicFacility | null;
}

/**
 * Bentuk data fasilitas untuk halaman status operasional petugas (REP-04).
 * Provenance status terakhir ikut dibawa agar petugas tahu siapa dan kapan
 * perubahan dibuat.
 */
export interface StaffFacility extends Omit<PublicFacility, "status"> {
  status: StatusFasilitas;
  statusChangedAt: string | null;
  statusChangedBy: { id: number; nama: string; role: Role } | null;
}

export async function listStaffFacilitiesService(): Promise<StaffFacility[]> {
  const facilities = await findStaffFacilities();

  return facilities.map((facility) => ({
    id: facility.id,
    nama: facility.nama,
    tipe: facility.tipe,
    lokasi: facility.lokasi,
    kapasitas: facility.kapasitas,
    deskripsi: facility.deskripsi,
    status: facility.status,
    statusChangedAt: facility.statusChangedAt ? facility.statusChangedAt.toISOString() : null,
    statusChangedBy: facility.statusChangedBy
      ? { id: facility.statusChangedBy.id, nama: facility.statusChangedBy.nama, role: facility.statusChangedBy.role }
      : null,
  }));
}
