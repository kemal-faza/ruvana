// Kontrak antar-modul "status fasilitas berubah" (PRD Bagian 7.3, D-009).
// Modul 3 (RES-09) = listener terhadap perubahan ini; Modul 4 (REP-04) = pemicu.
// Wiring dilakukan langsung: pemilik transaksi (facility-status-service / admin-facility-service)
// memanggil listener handleFacilityStatusChanged dengan client transaksi yang sama.

import type { StatusFasilitas } from "../generated/prisma/enums";

export interface FacilityStatusChangedPayload {
  facilityId: number;
  statusBaru: StatusFasilitas;
  waktu: Date;
  /** Petugas/aktor yang memicu perubahan */
  diubahOleh: number;
}
