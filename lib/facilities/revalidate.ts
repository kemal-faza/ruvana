import { revalidatePath } from "next/cache";

/**
 * Invalidasi representasi publik dan admin sebuah fasilitas setelah datanya
 * berubah, supaya katalog `/fasilitas` dan pengelolaan admin `/admin/fasilitas`
 * tidak menyajikan data basi (FAC-04).
 *
 * Pemanggil: Modul 4 (REP-04) lewat PATCH status operasional, dan FAC-05 lewat
 * POST/PATCH `/api/admin/facilities`.
 *
 * View admin baru berupa daftar `/admin/fasilitas`; belum ada route detail
 * `/admin/fasilitas/{id}`, jadi path-nya tidak didaftarkan di sini.
 */
export function revalidateFacilityViews(facilityId: number): void {
  revalidatePath("/fasilitas");
  revalidatePath(`/fasilitas/${facilityId}`);
  revalidatePath("/admin/fasilitas");
}
