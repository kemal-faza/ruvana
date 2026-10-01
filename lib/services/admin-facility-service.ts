import { Prisma } from "@/generated/prisma/client";
import type { Role, StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";
import { lockFacilityById } from "@/lib/db/facilities";
import {
  countAdminFacilities,
  createAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
  updateAdminFacility,
  type AdminFacilityFilters,
} from "@/lib/db/admin-facilities";
import { canTransition } from "@/lib/facilities/status-transition";
import { handleFacilityStatusChanged } from "@/lib/reservations/maintenance-listener";
import type { FacilityStatusChangedPayload } from "@/lib/facility-status-contract";
import { prisma } from "@/lib/prisma";
import type { AdminListQuery, FacilityCreateInput, FacilityUpdateInput } from "@/lib/validation/admin-facility";

export interface AdminFacilityActor {
  id: number;
  nama: string;
  role: Role;
}

export interface AdminFacility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  statusChangedAt: string | null;
  statusChangedBy: AdminFacilityActor | null;
}

export interface AdminFacilityCollection {
  items: AdminFacility[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

interface AdminFacilityRow {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  statusChangedAt: Date | null;
  statusChangedBy: AdminFacilityActor | null;
}

function toAdminFacility(row: AdminFacilityRow): AdminFacility {
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

export type AdminFacilityMutationError =
  | { type: "not_found"; message: string }
  | { type: "transition"; message: string }
  | { type: "duplicate_name"; message: string };

type PersistSuccess<T> = (tx: Prisma.TransactionClient, result: T) => Promise<void>;

export async function listAdminFacilities(query: AdminListQuery): Promise<AdminFacilityCollection> {
  const skip = (query.page - 1) * query.perPage;
  const filters: AdminFacilityFilters = {
    ...(query.search !== undefined ? { search: query.search } : {}),
    ...(query.type !== undefined ? { type: query.type } : {}),
    ...(query.location !== undefined ? { location: query.location } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
  };

  const [items, totalItems] = await Promise.all([
    findAdminFacilities({ skip, take: query.perPage, ...filters }),
    countAdminFacilities(filters),
  ]);

  return {
    items: items.map(toAdminFacility),
    meta: {
      page: query.page,
      perPage: query.perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / query.perPage),
    },
  };
}

export async function getAdminFacility(id: number): Promise<AdminFacility | null> {
  const row = await findAdminFacilityById(id);
  return row ? toAdminFacility(row) : null;
}

export async function createFacility(
  input: FacilityCreateInput,
): Promise<{ ok: true; data: AdminFacility } | { ok: false; error: AdminFacilityMutationError }> {
  try {
    const row = await createAdminFacility(input);
    return { ok: true, data: toAdminFacility(row) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: { type: "duplicate_name", message: "Nama fasilitas sudah digunakan" } };
    }
    throw e;
  }
}

export async function updateFacility(
  actorId: number,
  facilityId: number,
  input: FacilityUpdateInput,
  now: Date = new Date(),
  persistSuccess?: PersistSuccess<AdminFacility>,
): Promise<{ ok: true; data: AdminFacility } | { ok: false; error: AdminFacilityMutationError }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const facility = await lockFacilityById(tx, facilityId);
      if (!facility) throw { kind: "not_found" as const };

      const data: Prisma.FacilityUncheckedUpdateInput = {};
      if (input.nama !== undefined) data.nama = input.nama;
      if (input.tipe !== undefined) data.tipe = input.tipe;
      if (input.lokasi !== undefined) data.lokasi = input.lokasi;
      if (input.kapasitas !== undefined) data.kapasitas = input.kapasitas;
      if (input.deskripsi !== undefined) data.deskripsi = input.deskripsi;

      let statusBerubah = false;
      if (input.status !== undefined) {
        if (!canTransition(facility.status, input.status, "admin")) {
          throw {
            kind: "transition" as const,
            message: "Transisi status fasilitas tidak diizinkan dari status saat ini.",
          };
        }
        statusBerubah = true;
        data.status = input.status;
        data.statusChangedAt = now;
        data.statusChangedById = actorId;
      }

      const updated = await updateAdminFacility(tx, facilityId, data);

      // Hanya tujuan UNDER_MAINTENANCE yang memicu RES-09 lewat kontrak antarmodul.
      if (statusBerubah && input.status === "UNDER_MAINTENANCE") {
        const payload: FacilityStatusChangedPayload = {
          facilityId,
          statusBaru: input.status,
          waktu: now,
          diubahOleh: actorId,
        };
        await handleFacilityStatusChanged(tx, payload);
      }

      const response = toAdminFacility(updated);
      await persistSuccess?.(tx, response);
      return response;
    });

    return { ok: true, data: result };
  } catch (e) {
    if (e && typeof e === "object" && "kind" in e) {
      const err = e as { kind: string; message?: string };
      if (err.kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Fasilitas tidak ditemukan" } };
      }
      if (err.kind === "transition") {
        return { ok: false, error: { type: "transition", message: err.message ?? "Transisi tidak valid" } };
      }
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: { type: "duplicate_name", message: "Nama fasilitas sudah digunakan" } };
    }
    throw e;
  }
}
