import { Prisma } from "@/generated/prisma/client";
import type { Role, StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";
import { lockFacilityById } from "@/lib/db/facilities";
import {
  archiveAdminFacility,
  countAdminFacilities,
  countFacilityHistory,
  createAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
  findAdminFacilityLocations,
  findArchivedFacilities,
  findFacilityByFoto,
  restoreAdminFacility,
  updateAdminFacility,
  type AdminFacilityFilters,
  type CreateFacilityData,
} from "@/lib/db/admin-facilities";
import { canTransition } from "@/lib/facilities/status-transition";
import { facilityPhotoUrl } from "@/lib/facilities/photo-url";
import { handleFacilityStatusChanged } from "@/lib/reservations/maintenance-listener";
import type { FacilityStatusChangedPayload } from "@/lib/facility-status-contract";
import { prisma } from "@/lib/prisma";
import { verifyFacilityPhotoUpload, removeFacilityPhotoObject } from "@/lib/storage/facility-photo";
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
  fotoUrl: string | null;
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
  foto: string | null;
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
    fotoUrl: facilityPhotoUrl(row.id, row.foto),
    statusChangedAt: row.statusChangedAt ? row.statusChangedAt.toISOString() : null,
    statusChangedBy: row.statusChangedBy
      ? { id: row.statusChangedBy.id, nama: row.statusChangedBy.nama, role: row.statusChangedBy.role }
      : null,
  };
}

export type AdminFacilityMutationError =
  | { type: "not_found"; message: string }
  | { type: "transition"; message: string }
  | { type: "duplicate_name"; message: string }
  | { type: "invalid_photo"; message: string }
  | { type: "has_history"; message: string };

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

export async function listAdminLocations(): Promise<string[]> {
  const rows = await findAdminFacilityLocations();
  return rows.map((row) => row.lokasi);
}

/**
 * Buang blob foto yang tidak jadi dipakai karena mutasi gagal. Dicek dulu ke
 * database supaya blob yang ternyata sudah terpasang (mis. commit berhasil tapi
 * respons gagal) tidak ikut terhapus. Best-effort: kegagalan bersih-bersih tidak
 * boleh menutupi error asli.
 */
async function bersihkanFotoBelumTerpakai(pathname: string) {
  try {
    const terpasang = await findFacilityByFoto(pathname);
    if (!terpasang) await removeFacilityPhotoObject(pathname);
  } catch {
    // Biarkan; blob yatim masih bisa dibersihkan manual.
  }
}

export async function createFacility(
  actorId: number,
  input: FacilityCreateInput,
  persistSuccess?: PersistSuccess<AdminFacility>,
): Promise<{ ok: true; data: AdminFacility } | { ok: false; error: AdminFacilityMutationError }> {
  const data: CreateFacilityData = {
    nama: input.nama,
    tipe: input.tipe,
    lokasi: input.lokasi,
    kapasitas: input.kapasitas,
    ...(input.deskripsi !== undefined ? { deskripsi: input.deskripsi } : {}),
  };

  let uploadedFoto: string | null = null;
  if (typeof input.fotoPathname === "string") {
    const verified = await verifyFacilityPhotoUpload(
      input.fotoPathname,
      actorId,
      input.fotoType ?? "",
      input.fotoSize ?? 0,
    );
    if (!verified) {
      return { ok: false, error: { type: "invalid_photo", message: "Foto fasilitas tidak valid." } };
    }
    data.foto = input.fotoPathname;
    data.fotoContentType = verified.contentType;
    data.fotoSize = verified.size;
    uploadedFoto = input.fotoPathname;
  }

  try {
    // Pembuatan dan efek sampingnya (mis. simpan replay idempotency) satu transaksi,
    // mengikuti updateFacility.
    const result = await prisma.$transaction(async (tx) => {
      const row = await createAdminFacility(tx, data);
      const response = toAdminFacility(row);
      await persistSuccess?.(tx, response);
      return response;
    });

    return { ok: true, data: result };
  } catch (e) {
    // Jangan tinggalkan blob yatim bila pembuatan gagal (mis. nama duplikat).
    if (uploadedFoto) await bersihkanFotoBelumTerpakai(uploadedFoto);
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
  // Verifikasi foto di luar transaksi (panggilan jaringan Blob) agar lock baris singkat.
  let fotoBaru: { pathname: string; contentType: string; size: number } | null = null;
  if (typeof input.fotoPathname === "string") {
    const verified = await verifyFacilityPhotoUpload(
      input.fotoPathname,
      actorId,
      input.fotoType ?? "",
      input.fotoSize ?? 0,
    );
    if (!verified) {
      return { ok: false, error: { type: "invalid_photo", message: "Foto fasilitas tidak valid." } };
    }
    fotoBaru = { pathname: input.fotoPathname, contentType: verified.contentType, size: verified.size };
  }

  let fotoLamaUntukDihapus: string | null = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const facility = await lockFacilityById(tx, facilityId);
      if (!facility || facility.deletedAt) throw { kind: "not_found" as const };

      const data: Prisma.FacilityUncheckedUpdateInput = {};
      if (input.nama !== undefined) data.nama = input.nama;
      if (input.tipe !== undefined) data.tipe = input.tipe;
      if (input.lokasi !== undefined) data.lokasi = input.lokasi;
      if (input.kapasitas !== undefined) data.kapasitas = input.kapasitas;
      if (input.deskripsi !== undefined) data.deskripsi = input.deskripsi;

      if (input.fotoPathname !== undefined) {
        if (fotoBaru) {
          data.foto = fotoBaru.pathname;
          data.fotoContentType = fotoBaru.contentType;
          data.fotoSize = fotoBaru.size;
          if (facility.foto && facility.foto !== fotoBaru.pathname) fotoLamaUntukDihapus = facility.foto;
        } else {
          // fotoPathname === null: hapus foto, kembali ke placeholder statis.
          data.foto = null;
          data.fotoContentType = null;
          data.fotoSize = null;
          if (facility.foto) fotoLamaUntukDihapus = facility.foto;
        }
      }

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

    if (fotoLamaUntukDihapus) await removeFacilityPhotoObject(fotoLamaUntukDihapus);
    return { ok: true, data: result };
  } catch (e) {
    // Foto baru belum terpasang bila transaksi gagal; jangan tinggalkan blob yatim.
    if (fotoBaru) await bersihkanFotoBelumTerpakai(fotoBaru.pathname);
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

export interface ArchivedFacility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deletedAt: string;
  deletedByNama: string | null;
}

/** Fasilitas terarsip terbaru untuk halaman riwayat penghapusan admin. */
export async function listArchivedFacilities(take = 10): Promise<ArchivedFacility[]> {
  const rows = await findArchivedFacilities(take);
  return rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    tipe: row.tipe,
    lokasi: row.lokasi,
    kapasitas: row.kapasitas,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : new Date(0).toISOString(),
    deletedByNama: row.deletedByNama,
  }));
}

/**
 * Arsipkan fasilitas (soft delete). Hanya diizinkan bila fasilitas belum punya
 * riwayat (reservasi/laporan); jika ada, gunakan penonaktifan (status INACTIVE).
 * Baris tetap tersimpan beserta fotonya sehingga dapat dipulihkan.
 */
export async function archiveFacility(
  actor: { id: number; nama: string },
  facilityId: number,
  now: Date = new Date(),
): Promise<{ ok: true } | { ok: false; error: AdminFacilityMutationError }> {
  const riwayatPesan = "Fasilitas memiliki riwayat sehingga tidak dapat diarsipkan.";
  try {
    await prisma.$transaction(async (tx) => {
      const facility = await lockFacilityById(tx, facilityId);
      if (!facility || facility.deletedAt) throw { kind: "not_found" as const };

      if ((await countFacilityHistory(tx, facilityId)) > 0) throw { kind: "has_history" as const };

      await archiveAdminFacility(tx, facilityId, {
        deletedAt: now,
        deletedById: actor.id,
        deletedByNama: actor.nama,
      });
    });

    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "kind" in e) {
      const err = e as { kind: string };
      if (err.kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Fasilitas tidak ditemukan" } };
      }
      if (err.kind === "has_history") {
        return { ok: false, error: { type: "has_history", message: riwayatPesan } };
      }
    }
    throw e;
  }
}

/** Pulihkan fasilitas terarsip; mengembalikannya ke daftar aktif. */
export async function restoreFacility(
  facilityId: number,
): Promise<{ ok: true } | { ok: false; error: AdminFacilityMutationError }> {
  try {
    await prisma.$transaction(async (tx) => {
      const facility = await lockFacilityById(tx, facilityId);
      if (!facility || !facility.deletedAt) throw { kind: "not_found" as const };

      await restoreAdminFacility(tx, facilityId);
    });

    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "kind" in e) {
      const err = e as { kind: string };
      if (err.kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Fasilitas terarsip tidak ditemukan" } };
      }
    }
    throw e;
  }
}
