import type { Prisma } from "@/generated/prisma/client";
import type {
  AccountStatus,
  Role,
  StatusFasilitas,
  StatusLaporan,
  TipeFasilitas,
} from "@/generated/prisma/enums";
import {
  STATUS_LAPORAN_DIPROSES,
  STATUS_LAPORAN_DITOLAK,
  STATUS_LAPORAN_SELESAI,
  TRANSISI_STATUS_LAPORAN,
} from "@/config/business";
import {
  countStaffReports,
  findStaffReportById,
  findStaffReportHandlers,
  findStaffReports,
  lockReportById,
  type StaffReportRow,
} from "@/lib/db/reports";
import { prisma } from "@/lib/prisma";
import {
  STATUS_ANTREAN_LAPORAN,
  type AntreanLaporan,
  type UrutanLaporan,
} from "@/lib/validation/report-processing";

type PersistSuccess<T> = (tx: Prisma.TransactionClient, result: T) => Promise<void>;

/** Aktor petugas/admin; bentuk OpenAPI `StaffUser`. */
interface ReportStaffUser {
  id: number;
  nama: string;
  role: Role;
}

interface StaffReportFacility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi: string | null;
  status: StatusFasilitas;
  statusChangedAt: string | null;
  statusChangedBy: ReportStaffUser | null;
}

/** Pelapor tanpa kredensial; bentuk OpenAPI `SafeUser`. */
interface ReportReporter {
  id: number;
  nama: string;
  email: string;
  role: Role;
  status: AccountStatus;
  waktuDaftar: string;
  waktuVerifikasi: string | null;
}

/** Metadata foto tanpa URL private; bentuk OpenAPI `PhotoMetadata`. */
interface StaffReportPhoto {
  hasPhoto: boolean;
  contentType: string | null;
  size: number | null;
}

/** Bentuk respons OpenAPI `StaffReport` untuk jalur petugas (REP-03). */
export interface StaffReportResult {
  id: number;
  facility: StaffReportFacility;
  pelapor: ReportReporter;
  kategori: string;
  deskripsi: string;
  foto: StaffReportPhoto;
  status: StatusLaporan;
  catatanResolusi: string | null;
  ditanganiOleh: ReportStaffUser | null;
  createdAt: string;
  processedAt: string | null;
}

export interface StaffReportCollection {
  items: StaffReportResult[];
  meta: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

type ReportProcessingServiceError =
  | { type: "not_found"; message: string }
  | { type: "transition"; message: string };

type ReportProcessingResult =
  | { ok: true; data: StaffReportResult }
  | { ok: false; error: ReportProcessingServiceError };

function toUtc(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toStaffReportResult(row: StaffReportRow, ditanganiOleh: ReportStaffUser | null): StaffReportResult {
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
      statusChangedAt: toUtc(row.facility.statusChangedAt),
      statusChangedBy: row.facility.statusChangedBy,
    },
    pelapor: {
      id: row.user.id,
      nama: row.user.nama,
      email: row.user.email,
      role: row.user.role,
      status: row.user.status,
      waktuDaftar: row.user.waktuDaftar.toISOString(),
      waktuVerifikasi: toUtc(row.user.waktuVerifikasi),
    },
    kategori: row.kategori,
    deskripsi: row.deskripsi,
    foto: {
      hasPhoto: row.foto != null,
      contentType: row.fotoContentType,
      size: row.fotoSize,
    },
    status: row.status,
    catatanResolusi: row.catatanResolusi,
    ditanganiOleh,
    createdAt: row.createdAt.toISOString(),
    processedAt: toUtc(row.waktuDiproses),
  };
}

function handlerIds(rows: StaffReportRow[]): number[] {
  return [...new Set(rows.flatMap((row) => (row.ditanganiOleh != null ? [row.ditanganiOleh] : [])))];
}

async function attachHandlers(
  rows: StaffReportRow[],
  client: Pick<Prisma.TransactionClient, "user"> = prisma,
): Promise<Map<number, ReportStaffUser>> {
  const handlers = await findStaffReportHandlers(handlerIds(rows), client);
  return new Map(handlers.map((user) => [user.id, { id: user.id, nama: user.nama, role: user.role }]));
}

/** Antrean laporan masuk, daftar pekerjaan, dan riwayat arsip petugas. */
export async function listStaffReportQueueService(query: {
  queue: AntreanLaporan;
  urut: UrutanLaporan;
  page: number;
  perPage: number;
}): Promise<StaffReportCollection> {
  const { queue, urut, page, perPage } = query;
  const statuses = STATUS_ANTREAN_LAPORAN[queue];

  const [rows, totalItems] = await Promise.all([
    findStaffReports({ status: statuses, urut, skip: (page - 1) * perPage, take: perPage }),
    countStaffReports(statuses),
  ]);

  const handlers = await attachHandlers(rows);

  return {
    items: rows.map((row) => toStaffReportResult(row, row.ditanganiOleh == null ? null : handlers.get(row.ditanganiOleh) ?? null)),
    meta: { page, perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) },
  };
}

/** Detail operasional satu laporan; pathname foto tidak pernah dikembalikan. */
export async function getStaffReportService(
  id: number,
): Promise<{ ok: true; data: StaffReportResult } | { ok: false; error: ReportProcessingServiceError }> {
  const row = await findStaffReportById(id);
  if (!row) {
    return { ok: false, error: { type: "not_found", message: "Laporan tidak ditemukan" } };
  }
  const handlers = await attachHandlers([row]);
  return {
    ok: true,
    data: toStaffReportResult(row, row.ditanganiOleh == null ? null : handlers.get(row.ditanganiOleh) ?? null),
  };
}

function assertTransition(row: StaffReportRow, tujuan: StatusLaporan, aksi: string): void {
  const asal = row.status as keyof typeof TRANSISI_STATUS_LAPORAN;
  const diizinkan = TRANSISI_STATUS_LAPORAN[asal];

  if (!diizinkan || !diizinkan.includes(tujuan)) {
    throw {
      kind: "transition" as const,
      message: `Laporan tidak dapat ${aksi} dari status saat ini.`,
    };
  }
}

function mapServiceException(e: unknown): ReportProcessingServiceError | null {
  const err = e as Record<string, unknown>;
  if (!err || typeof err !== "object" || !("kind" in err)) return null;
  const kind = err.kind;
  if (kind === "not_found") {
    return { type: "not_found", message: "Laporan tidak ditemukan" };
  }
  if (kind === "transition") {
    return { type: "transition", message: err.message as string };
  }
  return null;
}

/**
 * REP-03: satu transaksi PostgreSQL menyimpan status, petugas penanganan, dan
 * satu instant pemrosesan server. Baris laporan dikunci sebelum status dibaca
 * supaya dua petugas tidak menerapkan transisi yang sama tepat satu kali.
 */
async function applyReportTransition(params: {
  staffId: number;
  id: number;
  tujuan: StatusLaporan;
  aksi: string;
  catatanResolusi?: string;
  now: Date;
  persistSuccess?: PersistSuccess<StaffReportResult>;
}): Promise<ReportProcessingResult> {
  const { staffId, id, tujuan, aksi, catatanResolusi, now, persistSuccess } = params;

  try {
    const response = await prisma.$transaction(async (tx) => {
      await lockReportById(tx, id);
      const row = await findStaffReportById(id, tx);
      if (!row) {
        throw { kind: "not_found" as const };
      }
      assertTransition(row, tujuan, aksi);

      // Pembaruan bersyarat: hanya pemenang race yang masih pada status asal
      // yang tercatat; yang kalah mendapat count 0 lalu ditolak tanpa perubahan.
      const guard = await tx.report.updateMany({
        where: { id, status: row.status },
        data: {
          status: tujuan,
          ditanganiOleh: staffId,
          waktuDiproses: now,
          ...(catatanResolusi !== undefined ? { catatanResolusi } : {}),
        },
      });
      if (guard.count === 0) {
        throw { kind: "transition" as const, message: `Laporan tidak dapat ${aksi} dari status saat ini.` };
      }

      const updated = await findStaffReportById(id, tx);
      if (!updated) {
        throw { kind: "not_found" as const };
      }

      const handlers = await attachHandlers([updated], tx);
      const result = toStaffReportResult(
        updated,
        updated.ditanganiOleh == null ? null : handlers.get(updated.ditanganiOleh) ?? null,
      );
      await persistSuccess?.(tx, result);
      return result;
    });

    return { ok: true, data: response };
  } catch (e: unknown) {
    const mapped = mapServiceException(e);
    if (mapped) return { ok: false, error: mapped };
    throw e;
  }
}

/** NEW -> IN_PROGRESS. */
export async function startStaffReportService(
  staffId: number,
  id: number,
  now: Date = new Date(),
): Promise<ReportProcessingResult> {
  return applyReportTransition({
    staffId,
    id,
    tujuan: STATUS_LAPORAN_DIPROSES,
    aksi: "dimulai",
    now,
  });
}

/** IN_PROGRESS -> RESOLVED; catatan penyelesaian wajib. */
export async function resolveStaffReportService(
  staffId: number,
  id: number,
  catatanResolusi: string,
  now: Date = new Date(),
  persistSuccess?: PersistSuccess<StaffReportResult>,
): Promise<ReportProcessingResult> {
  return applyReportTransition({
    staffId,
    id,
    tujuan: STATUS_LAPORAN_SELESAI,
    aksi: "diselesaikan",
    catatanResolusi,
    now,
    persistSuccess,
  });
}

/** NEW | IN_PROGRESS -> REJECTED; catatan penyelesaian wajib. */
export async function rejectStaffReportService(
  staffId: number,
  id: number,
  catatanResolusi: string,
  now: Date = new Date(),
  persistSuccess?: PersistSuccess<StaffReportResult>,
): Promise<ReportProcessingResult> {
  return applyReportTransition({
    staffId,
    id,
    tujuan: STATUS_LAPORAN_DITOLAK,
    aksi: "ditolak",
    catatanResolusi,
    now,
    persistSuccess,
  });
}
