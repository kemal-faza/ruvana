// Kontrak interface "status fasilitas berubah" — didefinisikan sekali di Fase 0.
// Modul 3 (TASK 3.7) = listener terhadap perubahan ini; Modul 4 (TASK 4.4) = pemicu.
// Tujuan: modul 3 & 4 bisa maju paralel tanpa saling menunggu implementasi.

import type { StatusFasilitas } from "../generated/prisma/enums";

export const FACILITY_STATUS_CHANGED = "facility.status.changed" as const;

export interface FacilityStatusChangedPayload {
  facilityId: number;
  statusBaru: StatusFasilitas;
  waktu: Date;
  /** Petugas/aktor yang memicu perubahan */
  diubahOleh: number;
}

// Dokumentasi kontrak (dipakai Modul 3 & 4):
// - Pemicu (Modul 4): saat status fasilitas berubah, panggil emitFacilityStatusChanged(payload).
// - Listener (Modul 3): saat payload statusBaru = 'dalam_perbaikan', batalkan reservasi
//   masa depan berstatus 'disetujui' pada facilityId tsb (alasan otomatis).
export type FacilityStatusChangedListener = (payload: FacilityStatusChangedPayload) => Promise<void>;
