import { prisma } from "@/lib/prisma";
import type { ProblemFieldError } from "@/lib/http/problem";
import { countMyReservations, findMyReservationById, listMyReservations } from "@/lib/db/reservations";
import { computeFacilityAvailability } from "@/lib/reservations/availability";
import type { ReservationCreateInput } from "@/lib/validation/reservation";
import type { MyReservationListQuery } from "@/lib/validation/reservation-query";
import { asiaJakartaToUtc, formatDateAsiaJakarta, formatTimeAsiaJakarta } from "@/lib/time/reservation-time";

export type ServiceError =
  | { type: "validation"; errors: ProblemFieldError[] }
  | { type: "not_found"; message: string }
  | { type: "facility_unavailable"; message: string }
  | { type: "conflict"; message: string; availability: unknown };

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

  // Validasi tanggal/slot lampau: menolak jika startsAt <= now
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
        // Bangun availability terbaru lewat sumber tunggal, di dalam transaksi
        // yang sama: teruskan tx agar konsisten dengan row lock, dan status
        // fasilitas yang sudah dibaca lewat SELECT ... FOR UPDATE agar tidak
        // query ulang di luar lock.
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

// Riwayat milik pengguna: hanya baris dengan userId sesi yang dibaca.
// Urutan deterministik createdAt DESC lalu id DESC (lihat db layer).
export async function listMyReservationsService(
  userId: number,
  query: MyReservationListQuery,
): Promise<{ ok: true; data: MyReservationCollection }> {
  const { page, perPage, status } = query;
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

// Detail milik pengguna: reservasi pengguna lain termasking sebagai not_found.
export async function getMyReservationService(
  userId: number,
  id: number,
): Promise<{ ok: true; data: ReservationResult } | { ok: false; error: Extract<ServiceError, { type: "not_found" }> }> {
  const row = await findMyReservationById(userId, id);
  if (!row) {
    return { ok: false, error: { type: "not_found", message: "Reservasi tidak ditemukan" } };
  }
  type ReservationRow = Parameters<typeof toReservationResponse>[0];
  return { ok: true, data: toReservationResponse(row as unknown as ReservationRow) };
}
