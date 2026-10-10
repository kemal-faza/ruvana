/**
 * URL same-origin untuk foto fasilitas yang diunggah. View memakai ini sebagai
 * sumber gambar, sementara pathname Blob mentah tidak pernah dikirim ke klien.
 */
export function facilityPhotoUrl(facilityId: number, foto: string | null | undefined): string | null {
  return foto ? `/api/facilities/${facilityId}/photo` : null
}
