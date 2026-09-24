import type { Role, StatusFasilitas, StatusLaporan, TipeFasilitas } from "@/generated/prisma/enums";
import { STATUS_LAPORAN, STATUS_LAPORAN_KERJA_PETUGAS } from "@/config/business";
import {
  countReportsByUser,
  countStaffReportsByStatus,
  createReport as createReportRow,
  findDefaultReportOwner,
  findFacilityById,
  findReportFacilityOptions,
  findReportsByStatus,
  findReportsByUser,
  findUsersById,
  type ReportWithFacility,
  type StaffReportPreviewRow,
} from "@/lib/db/reports";
import { removeReportPhoto, saveReportPhoto } from "@/lib/storage/report-photo";
import { validateReportSubmission, type ReportSubmissionErrors } from "@/lib/validation/report";

export type ReportStatus = StatusLaporan;

export interface ReportHandler {
  id: number;
  nama: string;
  role: Role;
}

export interface ReportItem {
  id: number;
  facilityId: number;
  facilityNama: string;
  facilityTipe: TipeFasilitas;
  facilityLokasi: string;
  facilityStatus: StatusFasilitas;
  kategori: string;
  deskripsi: string;
  fotoPath: string | null;
  status: ReportStatus;
  catatanResolusi: string | null;
  ditanganiOleh: ReportHandler | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityReportOption {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  status: StatusFasilitas;
}

export interface ListMyReportsParams {
  userId?: number;
  status?: ReportStatus;
}

export interface ReportListView {
  userId: number | null;
  items: ReportItem[];
  total: number;
  totalByStatus: Record<ReportStatus, number>;
}

export type StaffReportWorkStatus = (typeof STATUS_LAPORAN_KERJA_PETUGAS)[number];

export interface StaffReportPreview {
  id: number;
  facilityNama: string;
  kategori: string;
  deskripsi: string;
  status: StaffReportWorkStatus;
  createdAt: string;
}

export interface StaffReportWorkStatusSummary {
  total: number;
  items: StaffReportPreview[];
}

export type StaffReportWorkView = Record<StaffReportWorkStatus, StaffReportWorkStatusSummary>;

const STAFF_REPORT_PREVIEW_LIMIT = 3;

const ALL_REPORT_STATUSES: readonly StatusLaporan[] = STATUS_LAPORAN;

// Ambil maksimal 1.000 laporan per panggilan; filter & paginasi saat ini di sisi
// klien. Bila jumlah laporan melebihi batas, daftar terpotong diam-diam — paginasi
// server menyusul bersama seam sesi (lihat deskripsi PR).
const AMBIL_MAKS_LAPORAN = 1000;

export async function listMyReports({ userId, status }: ListMyReportsParams = {}): Promise<ReportListView> {
  const owner = userId ?? (await findDefaultReportOwner())?.id ?? null;
  const emptyView: ReportListView = {
    userId: null,
    items: [],
    total: 0,
    totalByStatus: { NEW: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 },
  };
  if (owner == null) return emptyView;

  const [rows, total, perStatus] = await Promise.all([
    findReportsByUser({ userId: owner, status, skip: 0, take: AMBIL_MAKS_LAPORAN }),
    countReportsByUser(owner, status),
    countPerStatus(owner),
  ]);

  const handlers = await resolveHandlers(rows);
  const items = rows.map((row) => toReportItem(row, handlers));

  return { userId: owner, items, total, totalByStatus: perStatus };
}

export async function listStaffReportWork(): Promise<StaffReportWorkView> {
  const results = await Promise.all(
    STATUS_LAPORAN_KERJA_PETUGAS.map(async (status) => {
      const [rows, total] = await Promise.all([
        findReportsByStatus({ status, skip: 0, take: STAFF_REPORT_PREVIEW_LIMIT }),
        countStaffReportsByStatus(status),
      ]);
      return [status, { total, items: rows.map(toStaffReportPreview) }] as const;
    }),
  );

  return Object.fromEntries(results) as StaffReportWorkView;
}

function toStaffReportPreview(row: StaffReportPreviewRow): StaffReportPreview {
  return {
    id: row.id,
    facilityNama: row.facility.nama,
    kategori: row.kategori,
    deskripsi: row.deskripsi,
    status: row.status as StaffReportWorkStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

async function countPerStatus(userId: number): Promise<Record<ReportStatus, number>> {
  const entries = await Promise.all(ALL_REPORT_STATUSES.map((s) => countReportsByUser(userId, s)));
  return Object.fromEntries(ALL_REPORT_STATUSES.map((s, i) => [s, entries[i]])) as Record<ReportStatus, number>;
}

async function resolveHandlers(rows: ReportWithFacility[]): Promise<Map<number, ReportHandler>> {
  const handlerIds = [...new Set(rows.map((row) => row.ditanganiOleh).filter((id): id is number => id != null))];
  const users = await findUsersById(handlerIds);
  return new Map(users.map((user) => [user.id, { id: user.id, nama: user.nama, role: user.role }]));
}

export function toReportItem(row: ReportWithFacility, handlers: Map<number, ReportHandler>): ReportItem {
  const handler = row.ditanganiOleh != null ? (handlers.get(row.ditanganiOleh) ?? null) : null;
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityNama: row.facility.nama,
    facilityTipe: row.facility.tipe,
    facilityLokasi: row.facility.lokasi,
    facilityStatus: row.facility.status,
    kategori: row.kategori,
    deskripsi: row.deskripsi,
    fotoPath: row.foto,
    status: row.status,
    catatanResolusi: row.catatanResolusi,
    ditanganiOleh: handler,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listReportFacilityOptions(): Promise<FacilityReportOption[]> {
  return findReportFacilityOptions();
}

export type CreateReportResult =
  | { ok: true; item: ReportItem }
  | { ok: false; errors: ReportSubmissionErrors; message: string };

export interface CreateReportInput {
  userId: number;
  facilityId: number | null;
  kategori: string;
  deskripsi: string;
  foto: File | null;
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const validation = validateReportSubmission({
    facilityId: input.facilityId,
    kategori: input.kategori,
    deskripsi: input.deskripsi,
    hasFoto: input.foto != null,
    fotoType: input.foto?.type,
    fotoSize: input.foto?.size,
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, message: "Periksa kembali isian laporan." };
  }

  const facility = input.facilityId != null ? await findFacilityById(input.facilityId) : null;
  if (!facility || facility.status === "INACTIVE") {
    return {
      ok: false,
      errors: { facilityId: "Fasilitas yang dipilih tidak tersedia." },
      message: "Fasilitas yang dipilih tidak tersedia.",
    };
  }

  const fotoResult = input.foto != null ? await saveReportPhoto(input.foto) : null;
  if (!fotoResult || !fotoResult.ok) {
    return {
      ok: false,
      errors: { foto: fotoResult?.message ?? "Foto wajib dilampirkan." },
      message: "Foto laporan gagal diunggah.",
    };
  }

  let row: ReportWithFacility;
  try {
    row = await createReportRow({
      userId: input.userId,
      facilityId: facility.id,
      kategori: input.kategori,
      deskripsi: input.deskripsi.trim(),
      foto: fotoResult.webPath,
    });
  } catch (error) {
    // File sudah ditulis; bila insert DB gagal, bersihkan agar tidak jadi orphan (PRD 11.3).
    await removeReportPhoto(fotoResult.webPath);
    throw error;
  }

  const handlers = await resolveHandlers([row]);
  return { ok: true, item: toReportItem(row, handlers) };
}
