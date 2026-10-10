import type { PublicFacilityFilters } from "@/lib/db/facilities";
import { countPublicFacilities, findPublicFacilities, findPublicFacilityById, findStaffFacilities } from "@/lib/db/facilities";
import { facilityPhotoUrl } from "@/lib/facilities/photo-url";
import type { Role, StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";

export interface PublicFacility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: "ACTIVE" | "UNDER_MAINTENANCE";
  fotoUrl: string | null;
}

interface PublicFacilityRow {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  foto: string | null;
}

/** Buang pathname Blob mentah; klien hanya menerima URL same-origin. */
function toPublicFacility(row: PublicFacilityRow): PublicFacility {
  return {
    id: row.id,
    nama: row.nama,
    tipe: row.tipe,
    lokasi: row.lokasi,
    kapasitas: row.kapasitas,
    deskripsi: row.deskripsi,
    status: row.status as PublicFacility["status"],
    fotoUrl: facilityPhotoUrl(row.id, row.foto),
  };
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
    items: items.map(toPublicFacility),
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
  return facility ? toPublicFacility(facility) : null;
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
    fotoUrl: facilityPhotoUrl(facility.id, facility.foto),
    statusChangedAt: facility.statusChangedAt ? facility.statusChangedAt.toISOString() : null,
    statusChangedBy: facility.statusChangedBy
      ? { id: facility.statusChangedBy.id, nama: facility.statusChangedBy.nama, role: facility.statusChangedBy.role }
      : null,
  }));
}
