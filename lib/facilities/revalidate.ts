import { revalidatePath } from "next/cache";

/**
 * Invalidasi representasi publik sebuah fasilitas setelah statusnya berubah,
 * supaya daftar dan detail fasilitas — rute peran `/fasilitas` maupun katalog
 * publik `/publik/fasilitas` — tidak menyajikan data basi (FAC-04).
 *
 * Pemanggil saat ini: Modul 4 (REP-04) lewat PATCH status operasional fasilitas.
 * View admin `/admin/fasilitas` menyusul bersama FAC-05; tambahkan path-nya di
 * sini ketika route tersebut benar-benar ada.
 */
export function revalidateFacilityViews(facilityId: number): void {
  revalidatePath("/fasilitas");
  revalidatePath(`/fasilitas/${facilityId}`);
  revalidatePath("/publik/fasilitas");
  revalidatePath(`/publik/fasilitas/${facilityId}`);
}
