import { revalidatePath } from "next/cache";

/**
 * Invalidasi representasi publik dan admin sebuah fasilitas setelah datanya
 * berubah, supaya daftar/detail tidak menyajikan data basi (FAC-04).
 *
 * Pemanggil: Modul 4 (REP-04) lewat PATCH status operasional, dan FAC-05 lewat
 * POST/PATCH `/api/admin/facilities`.
 */
export function revalidateFacilityViews(facilityId: number): void {
  revalidatePath("/fasilitas");
  revalidatePath(`/fasilitas/${facilityId}`);
  revalidatePath("/admin/fasilitas");
  revalidatePath(`/admin/fasilitas/${facilityId}`);
}
