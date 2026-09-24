import { BATAS_PEMBATALAN_JAM } from "@/config/business";
import { prisma } from "@/lib/prisma";
import type { ProblemFieldError } from "@/lib/http/problem";
import { lockFacilityById } from "@/lib/db/facilities";
import {
  countApprovedQueue,
  countMyReservations,
  countPendingQueue,
  findMyReservationById,
  findOverlappingApproved,
  listApprovedQueue,
  listMyReservations,
  listPendingQueue,
  lockReservationById,
} from "@/lib/db/reservations";
import { computeFacilityAvailability } from "@/lib/reservations/availability";
import { expirePendingReservations } from "@/lib/reservations/expiry";
import type { CancelReservationInput, ReservationCreateInput } from "@/lib/validation/reservation";
import type { MyReservationListQuery } from "@/lib/validation/reservation-query";
import { asiaJakartaToUtc, formatDateAsiaJakarta, formatTimeAsiaJakarta } from "@/lib/time/reservation-time";

export type ServiceError =
  | { type: "validation"; errors: ProblemFieldError[] }
  | { type: "not_found"; message: string }
  | { type: "facility_unavailable"; message: string }
  | { type: "conflict"; message: string; availability: unknown }
  | { type: "transition"; message: string };

export interface ReservationResult {
  id: number;
  facility: {
    id: number;
    nama: string;
    tipe: string;
    lokasi: string;
    kapasitas: number;
    deskripsi: string | null;
    status: string;
  };
  date: string;
  timezone: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  tujuanPenggunaan: string;
  status: string;
  alasan: string | null;
  submittedAt: string;
  processedAt: string | null;
  processedBy: null;
}

function toReservationResponse(row: {
  id: number;
  tanggal: Date;
  startTime: Date;
  endTime: Date;
  tujuanPenggunaan: string;
  status: string;
  alasan: string | null;
  createdAt: Date;
  waktuDiproses: Date | null;
  facility: { id: number; nama: string; tipe: string; lokasi: string; kapasitas: number; deskripsi: string | null; status: string };
}): ReservationResult {
  return {
    id: row.id,
    facility: {
      id: row.facility.id,
      nama: row.facility.nama,
      tipe: row.facility.tipe,
      lokasi: row.facility.lokasi,
      kapasitas: row.facility.kapasitas,
      deskripsi: row.facility.deskripsi,
      status: row.facility.status,
    },
    date: formatDateAsiaJakarta(row.tanggal),
    timezone: "Asia/Jakarta",
    startTime: formatTimeAsiaJakarta(row.startTime),
    endTime: formatTimeAsiaJakarta(row.endTime),
    startsAt: row.startTime.toISOString(),
    endsAt: row.endTime.toISOString(),
    tujuanPenggunaan: row.tujuanPenggunaan,
    status: row.status,
    alasan: row.alasan,
    submittedAt: row.createdAt.toISOString(),
    processedAt: row.waktuDiproses ? row.waktuDiproses.toISOString() : null,
    processedBy: null,
  };
}

export async function createReservationService(
  userId: number,
  input: ReservationCreateInput,
  now: Date = new Date(),
): Promise<{ ok: true; data: ReservationResult } | { ok: false; error: ServiceError }> {
  const startsAt = asiaJakartaToUtc(input.date, input.startTime);
  const endsAt = asiaJakartaToUtc(input.date, input.endTime);
  const tanggal = asiaJakartaToUtc(input.date, "00:00");

  if (startsAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: {
        type: "validation",
        errors: [
          {
            field: "date",
            code: "DATE_IN_PAST",
            message: "Tanggal atau slot sudah lewat dan tidak dapat direservasi",
          },
        ],
      },
    };
  }

  // Validasi urutan waktu sudah dilakukan di parse, tapi double-check untuk transaksi
  if (endsAt.getTime() <= startsAt.getTime()) {
    return {
      ok: false,
      error: {
        type: "validation",
        errors: [{ field: "endTime", code: "END_BEFORE_START", message: "endTime harus setelah startTime" }],
      },
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row lock di tabel facilities untuk mencegah race approval conflict
      await tx.$queryRaw`SELECT id FROM "facilities" WHERE id = ${input.facilityId} FOR UPDATE`;
      const facility = await tx.facility.findUnique({ where: { id: input.facilityId } });

      if (!facility) {
        throw { kind: "not_found" as const };
      }
      if (facility.status !== "ACTIVE") {
        throw { kind: "facility_unavailable" as const, status: facility.status };
      }

      // Cek bentrok dengan APPROVED (hanya APPROVED yang memblokir)
      const overlapping = await tx.reservation.findMany({
        where: {
          facilityId: input.facilityId,
          status: "APPROVED",
          startTime: { lt: endsAt },
          endTime: { gt: startsAt },
        },
        select: { id: true, startTime: true, endTime: true },
      });

      if (overlapping.length > 0) {
        const availability = await computeFacilityAvailability(input.facilityId, input.date, {
          client: tx,
          facilityStatus: facility.status,
        });
        throw { kind: "conflict" as const, availability };
      }

      const created = await tx.reservation.create({
        data: {
          userId,
          facilityId: input.facilityId,
          tanggal,
          startTime: startsAt,
          endTime: endsAt,
          tujuanPenggunaan: input.tujuanPenggunaan,
          status: "PENDING",
        },
        include: { facility: true },
      });

      return created;
    });

    const response = toReservationResponse(result as unknown as Parameters<typeof toReservationResponse>[0]);
    return { ok: true, data: response };
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    if (err && typeof err === "object" && "kind" in err) {
      if ((err as { kind: string }).kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Fasilitas tidak ditemukan" } };
      }
      if ((err as { kind: string }).kind === "facility_unavailable") {
        return {
          ok: false,
          error: {
            type: "validation",
            errors: [
              {
                field: "facilityId",
                code: "FACILITY_UNAVAILABLE",
                message: "Fasilitas tidak tersedia untuk reservasi",
              },
            ],
          },
        };
      }
      if ((err as { kind: string }).kind === "conflict") {
        const av = (err as { availability: unknown }).availability;
        return {
          ok: false,
          error: { type: "conflict", message: "Slot bertabrakan dengan reservasi yang telah disetujui.", availability: av },
        };
      }
    }
    throw e;
  }
}

// Ekspor helper untuk test
export { toReservationResponse };

export interface MyReservationCollection {
  items: ReservationResult[];
  meta: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function listMyReservationsService(
  userId: number,
  query: MyReservationListQuery,
): Promise<{ ok: true; data: MyReservationCollection }> {
  const { page, perPage, status } = query;
  await expirePendingReservations();
  const [rows, totalItems] = await Promise.all([
    listMyReservations({ userId, status, skip: (page - 1) * perPage, take: perPage }),
    countMyReservations({ userId, status }),
  ]);
  type ReservationRow = Parameters<typeof toReservationResponse>[0];
  return {
    ok: true,
    data: {
      items: rows.map((row) => toReservationResponse(row as unknown as ReservationRow)),
      meta: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      },
    },
  };
}

export async function getMyReservationService(
  userId: number,
  id: number,
): Promise<{ ok: true; data: ReservationResult } | { ok: false; error: Extract<ServiceError, { type: "not_found" }> }> {
  await expirePendingReservations();
  const row = await findMyReservationById(userId, id);
  if (!row) {
    return { ok: false, error: { type: "not_found", message: "Reservasi tidak ditemukan" } };
  }
  type ReservationRow = Parameters<typeof toReservationResponse>[0];
  return { ok: true, data: toReservationResponse(row as unknown as ReservationRow) };
}

export async function cancelMyReservationService(
  userId: number,
  id: number,
  input: CancelReservationInput,
  now: Date = new Date(),
): Promise<{ ok: true; data: ReservationResult } | { ok: false; error: ServiceError }> {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await expirePendingReservations(tx, now);
      // Kunci baris dulu agar pembatalan bersamaan atas id yang sama terserialisasi.
      await lockReservationById(tx, id);
      const row = await tx.reservation.findFirst({
        where: { id, userId },
        include: { facility: true },
      });
      if (!row) {
        throw { kind: "not_found" as const };
      }
      if (row.status !== "PENDING" && row.status !== "APPROVED") {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat dibatalkan." };
      }
      if (row.startTime.getTime() - now.getTime() < BATAS_PEMBATALAN_JAM * 60 * 60 * 1000) {
        throw {
          kind: "transition" as const,
          message: `Pembatalan hanya dapat dilakukan paling lambat ${BATAS_PEMBATALAN_JAM} jam sebelum waktu mulai. Hubungi petugas untuk bantuan.`,
        };
      }
      // Pembaruan bersyarat: hanya baris yang masih PENDING/APPROVED yang berubah.
      // Jika kalah race (sudah diproses/dibatalkan), count 0 → tolak sebagai transition.
      const guard = await tx.reservation.updateMany({
        where: { id: row.id, status: { in: ["PENDING", "APPROVED"] } },
        data: {
          status: "CANCELLED_BY_USER",
          alasan: input.alasan,
          waktuDiproses: now,
        },
      });
      if (guard.count === 0) {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat dibatalkan." };
      }
      return tx.reservation.findFirst({
        where: { id: row.id },
        include: { facility: true },
      });
    });
    if (!updated) {
      return { ok: false, error: { type: "not_found" as const, message: "Reservasi tidak ditemukan" } };
    }

    type ReservationRow = Parameters<typeof toReservationResponse>[0];
    return { ok: true, data: toReservationResponse(updated as unknown as ReservationRow) };
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    if (err && typeof err === "object" && "kind" in err) {
      if ((err as { kind: string }).kind === "not_found") {
        return { ok: false, error: { type: "not_found", message: "Reservasi tidak ditemukan" } };
      }
      if ((err as { kind: string }).kind === "transition") {
        return {
          ok: false,
          error: { type: "transition", message: (err as { message: string }).message },
        };
      }
    }
    throw e;
  }
}

export interface ActorRef {
  id: number;
  nama: string;
  role: string;
}

export interface PemohonRef {
  id: number;
  nama: string;
  email: string;
  role: string;
  status: string;
  waktuDaftar: string;
  waktuVerifikasi: string | null;
}

export interface StaffReservationResult extends Omit<ReservationResult, "processedBy"> {
  processedBy: ActorRef | null;
  pemohon: PemohonRef;
}

export interface StaffReservationCollection {
  items: StaffReservationResult[];
  meta: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

type StaffReservationRow = Parameters<typeof toReservationResponse>[0] & {
  user: {
    id: number;
    nama: string;
    email: string;
    role: string;
    status: string;
    waktuDaftar: Date;
    waktuVerifikasi: Date | null;
  };
};

function toStaffReservationResponse(row: StaffReservationRow, actor: ActorRef | null): StaffReservationResult {
  return {
    ...toReservationResponse(row),
    processedBy: actor,
    pemohon: {
      id: row.user.id,
      nama: row.user.nama,
      email: row.user.email,
      role: row.user.role,
      status: row.user.status,
      waktuDaftar: row.user.waktuDaftar.toISOString(),
      waktuVerifikasi: row.user.waktuVerifikasi ? row.user.waktuVerifikasi.toISOString() : null,
    },
  };
}

function mapServiceException(e: unknown): ServiceError | null {
  const err = e as Record<string, unknown>;
  if (!err || typeof err !== "object" || !("kind" in err)) return null;
  const kind = (err as { kind: string }).kind;
  const message = (err as { message?: unknown }).message;
  if (kind === "not_found") {
    return {
      type: "not_found",
      message: typeof message === "string" ? message : "Reservasi tidak ditemukan",
    };
  }
  if (kind === "transition") {
    return { type: "transition", message: (err as { message: string }).message };
  }
  if (kind === "conflict") {
    return {
      type: "conflict",
      message: (err as { message: string }).message,
      availability: (err as { availability: unknown }).availability,
    };
  }
  return null;
}

export async function listStaffQueueService(query: {
  page: number;
  perPage: number;
}): Promise<{ ok: true; data: StaffReservationCollection }> {
  const { page, perPage } = query;
  await expirePendingReservations();
  const [rows, totalItems] = await Promise.all([
    listPendingQueue({ skip: (page - 1) * perPage, take: perPage }),
    countPendingQueue(),
  ]);
  return {
    ok: true,
    data: {
      items: (rows as unknown as StaffReservationRow[]).map((row) => toStaffReservationResponse(row, null)),
      meta: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      },
    },
  };
}

export async function listStaffApprovedService(query: {
  page: number;
  perPage: number;
}): Promise<{ ok: true; data: StaffReservationCollection }> {
  const { page, perPage } = query;
  const [rows, totalItems] = await Promise.all([
    listApprovedQueue({ skip: (page - 1) * perPage, take: perPage }),
    countApprovedQueue(),
  ]);
  return {
    ok: true,
    data: {
      items: (rows as unknown as StaffReservationRow[]).map((row) => toStaffReservationResponse(row, null)),
      meta: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      },
    },
  };
}

export async function approveReservationService(
  staffId: number,
  id: number,
  now: Date = new Date(),
): Promise<{ ok: true; data: StaffReservationResult } | { ok: false; error: ServiceError }> {
  try {
    const { updated, actor } = await prisma.$transaction(async (tx) => {
      await expirePendingReservations(tx, now);
      // Kunci baris reservasi SEBELUM membaca status agar approve/reject
      // bersamaan atas id yang sama terserialisasi; pembaca kedua melihat
      // status terbaru setelah pemenang commit (RES-06).
      await lockReservationById(tx, id);
      const row = await tx.reservation.findUnique({
        where: { id },
        include: { facility: true },
      });
      if (!row) {
        throw { kind: "not_found" as const };
      }
      if (row.status !== "PENDING") {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat disetujui." };
      }
      const facility = await lockFacilityById(tx, row.facilityId);
      if (!facility) {
        throw { kind: "not_found" as const, message: "Fasilitas tidak ditemukan" };
      }

      if (facility.status !== "ACTIVE") {
        throw { kind: "transition" as const, message: "Fasilitas tidak tersedia untuk persetujuan." };
      }
      const overlapping = await findOverlappingApproved(tx, {
        facilityId: row.facilityId,
        startsAt: row.startTime,
        endsAt: row.endTime,
      });
      if (overlapping.length > 0) {
        const availability = await computeFacilityAvailability(row.facilityId, formatDateAsiaJakarta(row.tanggal), {
          client: tx,
          facilityStatus: facility.status,
        });
        throw {
          kind: "conflict" as const,
          message: "Slot reservasi telah disetujui untuk reservasi lain.",
          availability,
        };
      }
      // Pembaruan bersyarat: hanya pemenang race yang masih PENDING yang
      // tercatat; yang kalah mendapat count 0 → transition (RES-06 tepat satu kali).
      const guard = await tx.reservation.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          waktuDiproses: now,
          diprosesOleh: staffId,
        },
      });
      if (guard.count === 0) {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat disetujui." };
      }
      const updated = await tx.reservation.findUnique({
        where: { id: row.id },
        include: { facility: true, user: true },
      });
      const actorRow = await tx.user.findUnique({
        where: { id: staffId },
        select: { id: true, nama: true, role: true },
      });
      return {
        updated,
        actor: actorRow ? { id: actorRow.id, nama: actorRow.nama, role: actorRow.role } : null,
      };
    });

    return {
      ok: true,
      data: toStaffReservationResponse(updated as unknown as StaffReservationRow, actor),
    };
  } catch (e: unknown) {
    const mapped = mapServiceException(e);
    if (mapped) return { ok: false, error: mapped };
    throw e;
  }
}

// Reject: alasan wajib divalidasi di route; row lock menyeragamkan race dengan approve.
export async function rejectReservationService(
  staffId: number,
  id: number,
  input: CancelReservationInput,
  now: Date = new Date(),
): Promise<{ ok: true; data: StaffReservationResult } | { ok: false; error: ServiceError }> {
  try {
    const { updated, actor } = await prisma.$transaction(async (tx) => {
      await expirePendingReservations(tx, now);
      // Kunci baris reservasi sebelum membaca status (RES-06): approve dan
      // reject bersamaan atas id yang sama terserialisasi.
      await lockReservationById(tx, id);
      const row = await tx.reservation.findUnique({
        where: { id },
        include: { facility: true },
      });
      if (!row) {
        throw { kind: "not_found" as const };
      }
      if (row.status !== "PENDING") {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat ditolak." };
      }
      await lockFacilityById(tx, row.facilityId);
      const guard = await tx.reservation.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          alasan: input.alasan,
          waktuDiproses: now,
          diprosesOleh: staffId,
        },
      });
      if (guard.count === 0) {
        throw { kind: "transition" as const, message: "Reservasi tidak berada pada status yang dapat ditolak." };
      }
      const updated = await tx.reservation.findUnique({
        where: { id: row.id },
        include: { facility: true, user: true },
      });
      const actorRow = await tx.user.findUnique({
        where: { id: staffId },
        select: { id: true, nama: true, role: true },
      });
      return {
        updated,
        actor: actorRow ? { id: actorRow.id, nama: actorRow.nama, role: actorRow.role } : null,
      };
    });

    return {
      ok: true,
      data: toStaffReservationResponse(updated as unknown as StaffReservationRow, actor),
    };
  } catch (e: unknown) {
    const mapped = mapServiceException(e);
    if (mapped) return { ok: false, error: mapped };
    throw e;
  }
}

export async function cancelReservationByOfficerService(
  staffId: number,
  id: number,
  input: CancelReservationInput,
  now: Date = new Date(),
): Promise<{ ok: true; data: StaffReservationResult } | { ok: false; error: ServiceError }> {
  try {
    const { updated, actor } = await prisma.$transaction(async (tx) => {
      // Kunci baris reservasi sebelum membaca status agar pembatalan
      // bersamaan atas id yang sama terserialisasi.
      await lockReservationById(tx, id);
      const row = await tx.reservation.findUnique({
        where: { id },
        include: { facility: true },
      });
      if (!row) {
        throw { kind: "not_found" as const };
      }
      if (row.status !== "APPROVED") {
        throw { kind: "transition" as const, message: "Hanya reservasi berstatus disetujui yang dapat dibatalkan petugas." };
      }
      await lockFacilityById(tx, row.facilityId);
      const guard = await tx.reservation.updateMany({
        where: { id: row.id, status: "APPROVED" },
        data: {
          status: "CANCELLED_BY_OFFICER",
          alasan: input.alasan,
          waktuDiproses: now,
          diprosesOleh: staffId,
        },
      });
      if (guard.count === 0) {
        throw { kind: "transition" as const, message: "Hanya reservasi berstatus disetujui yang dapat dibatalkan petugas." };
      }
      const updated = await tx.reservation.findUnique({
        where: { id: row.id },
        include: { facility: true, user: true },
      });
      const actorRow = await tx.user.findUnique({
        where: { id: staffId },
        select: { id: true, nama: true, role: true },
      });
      return {
        updated,
        actor: actorRow ? { id: actorRow.id, nama: actorRow.nama, role: actorRow.role } : null,
      };
    });

    return {
      ok: true,
      data: toStaffReservationResponse(updated as unknown as StaffReservationRow, actor),
    };
  } catch (e: unknown) {
    const mapped = mapServiceException(e);
    if (mapped) return { ok: false, error: mapped };
    throw e;
  }
}
