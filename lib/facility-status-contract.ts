// Kontrak interface "status fasilitas berubah" — didefinisikan sekali di Fase 0.
// Modul 3 (RES-09) = listener terhadap perubahan ini; Modul 4 (REP-04) = pemicu.
// Tujuan: modul 3 & 4 bisa maju paralel tanpa saling menunggu implementasi.

import type { Prisma } from "../generated/prisma/client";
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
// - Pemicu (Modul 4, TASK 4.4): buka satu transaksi, ubah status fasilitas, teruskan
//   client transaksi + payload ke listener, tunggu listener sebelum commit.
// - Listener (Modul 3, sudah diimplementasikan di
//   lib/reservations/maintenance-listener.ts): saat payload statusBaru =
//   'UNDER_MAINTENANCE', batalkan reservasi masa depan berstatus 'APPROVED'
//   pada facilityId tsb (alasan otomatis). Listener tidak boleh membuka
//   transaksi sendiri.
// - Ketiadaan callsite di PR Modul 3 adalah dependensi integrasi yang
//   dikerjakan Modul 4, bukan blocker PR ini.
export type FacilityStatusChangedListener = (
  transaction: Prisma.TransactionClient,
  payload: FacilityStatusChangedPayload,
) => Promise<void>;
