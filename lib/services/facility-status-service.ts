import type { StatusFasilitasOperasional } from "@/config/business";
import { TRANSISI_STATUS_FASILITAS_OPERASIONAL } from "@/config/business";
import type { Prisma } from "@/generated/prisma/client";
import type { Role, StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";
import { lockFacilityById } from "@/lib/db/facilities";
import type { FacilityStatusChangedPayload } from "@/lib/facility-status-contract";
import { prisma } from "@/lib/prisma";
import { handleFacilityStatusChanged } from "@/lib/reservations/maintenance-listener";

type PersistSuccess<T> = (tx: Prisma.TransactionClient, result: T) => Promise<void>;

export interface FacilityStatusActor {
  id: number;
  nama: string;
  role: Role;
}

/** Bentuk respons OpenAPI `Facility` untuk jalur operasional/admin (REP-04). */
export interface FacilityStatusResult {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  statusChangedAt: string | null;
  statusChangedBy: FacilityStatusActor | null;
}

export type FacilityStatusServiceError =
  | { type: "not_found"; message: string }
  | { type: "transition"; message: string };

interface FacilityStatusRow {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  statusChangedAt: Date | null;
  statusChangedBy: FacilityStatusActor | null;
}

function toFacilityStatusResult(row: FacilityStatusRow): FacilityStatusResult {
  return {
    id: row.id,
    nama: row.nama,
    tipe: row.tipe,
    lokasi: row.lokasi,
    kapasitas: row.kapasitas,
    deskripsi: row.deskripsi,
    status: row.status,
    statusChangedAt: row.statusChangedAt ? row.statusChangedAt.toISOString() : null,
    statusChangedBy: row.statusChangedBy
      ? { id: row.statusChangedBy.id, nama: row.statusChangedBy.nama, role: row.statusChangedBy.role }
      : null,
  };
}

/**
 * Service perubahan status operasional fasilitas (REP-04).
 *
 * Emitter kontrak `facility.status.changed` (PRD Bagian 7.3, D-009): satu
 * transaksi PostgreSQL menyimpan status + provenance, meneruskan client
 * transaksi yang sama ke listener Modul 3, dan menunggu listener selesai
 * sebelum commit — transisi ke UNDER_MAINTENANCE membatalkan reservasi
 * APPROVED masa depan secara all-or-nothing.
 */
export async function updateFacilityOperationalStatusService(
  actorId: number,
  facilityId: number,
  statusBaru: StatusFasilitasOperasional,
  now: Date = new Date(),
  persistSuccess?: PersistSuccess<FacilityStatusResult>,
): Promise<{ ok: true; data: FacilityStatusResult } | { ok: false; error: FacilityStatusServiceError }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row lock menyerialkan perubahan status bersamaan pada fasilitas yang sama.
      const facility = await lockFacilityById(tx, facilityId);
      if (!facility) {
        throw { kind: "not_found" as const };
      }
      // INACTIVE tidak pernah menjadi asal atau tujuan jalur operasional (REP-04).
      if (
        facility.status === "INACTIVE" ||
        TRANSISI_STATUS_FASILITAS_OPERASIONAL[facility.status] !== statusBaru
      ) {
        throw {
          kind: "transition" as const,
          message: "Transisi status fasilitas tidak diizinkan dari status saat ini.",
        };
      }

      const updated = await tx.facility.update({
        where: { id: facilityId },
        data: { status: statusBaru, statusChangedAt: now, statusChangedById: actorId },
        include: { statusChangedBy: { select: { id: true, nama: true, role: true } } },
      });

      // Payload memakai instant `now` yang sama dengan provenance, sehingga batas
      // pembatalan reservasi masa depan identik dengan statusChangedAt (REP-04/RES-09).
      const payload: FacilityStatusChangedPayload = {
        facilityId,
        statusBaru,
        waktu: now,
        diubahOleh: actorId,
      };
      await handleFacilityStatusChanged(tx, payload);

      const response = toFacilityStatusResult(updated);
      await persistSuccess?.(tx, response);
      return response;
    });

    return { ok: true, data: result };
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    if (err && typeof err === "object" && "kind" in err) {
      if (err.kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Fasilitas tidak ditemukan" } };
      }
      if (err.kind === "transition") {
        return { ok: false, error: { type: "transition", message: err.message as string } };
      }
    }
    throw e;
  }
}
