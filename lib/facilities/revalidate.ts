import { revalidatePath } from "next/cache";

/**
 * Invalidasi representasi publik dan admin sebuah fasilitas setelah statusnya
 * berubah, supaya daftar `/fasilitas`, detail `/fasilitas/{id}`, dan grid
 * ketersediaannya tidak menyajikan data basi (FAC-04).
 *
 * Pemanggil: FAC-05 (CRUD fasilitas admin) dan Modul 4 (REP-04 perubahan status
 * maintenance). Realtime tanpa refetch di luar scope; klien lain melihat status
 * terbaru pada navigasi atau refetch berikutnya.
 */
export function revalidateFacilityViews(facilityId: number): void {
  revalidatePath("/fasilitas");
  revalidatePath(`/fasilitas/${facilityId}`);
  revalidatePath("/admin/fasilitas");
  revalidatePath(`/admin/fasilitas/${facilityId}`);
}
