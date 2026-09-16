import { countPublicFacilities, findPublicFacilities, findPublicFacilityById } from "@/lib/db/facilities";
import type { TipeFasilitas } from "@/generated/prisma/enums";

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

export async function listPublicFacilities({ page, perPage }: { page: number; perPage: number }): Promise<PublicFacilityCollection> {
  const skip = (page - 1) * perPage;

  const [items, totalItems] = await Promise.all([
    findPublicFacilities({ skip, take: perPage }),
    countPublicFacilities(),
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
