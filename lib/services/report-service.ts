import type { Role, StatusFasilitas, StatusLaporan, TipeFasilitas } from "@/generated/prisma/enums";
import { STATUS_LAPORAN, STATUS_LAPORAN_KERJA_PETUGAS } from "@/config/business";
import {
  countReportsByUser,
  countStaffReportsByStatus,
  createReport as createReportRow,
  findFacilityById,
  findReportByFoto,
  findReportFacilityOptions,
  findReportsByStatus,
  findReportsByUser,
  findUsersById,
  type ReportWithFacility,
  type StaffReportPreviewRow,
} from "@/lib/db/reports";
import {
  isOwnedReportPhotoPathname,
  removeReportPhoto,
  verifyReportPhotoUpload,
} from "@/lib/storage/report-photo";
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
  fotoUrl: string | null;
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
  userId: number;
  status?: ReportStatus;
}

export interface ReportListView {
  userId: number;
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

// Ambil maksimal 1.000 laporan per panggilan; filter dan paginasi saat ini di sisi klien.
const AMBIL_MAKS_LAPORAN = 1000;

export async function listMyReports({ userId, status }: ListMyReportsParams): Promise<ReportListView> {
  const [rows, total, perStatus] = await Promise.all([
    findReportsByUser({ userId, status, skip: 0, take: AMBIL_MAKS_LAPORAN }),
    countReportsByUser(userId, status),
    countPerStatus(userId),
  ]);

  const handlers = await resolveHandlers(rows);
  const items = rows.map((row) => toReportItem(row, handlers));

  return { userId, items, total, totalByStatus: perStatus };
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
    fotoUrl: row.foto ? "/api/reports/" + row.id + "/photo" : null,
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
  foto: { pathname: string; contentType: string; size: number } | null;
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const photo = input.foto;
  const validation = validateReportSubmission({
    facilityId: input.facilityId,
    kategori: input.kategori,
    deskripsi: input.deskripsi,
    hasFoto: photo != null,
    fotoType: photo?.contentType,
    fotoSize: photo?.size,
  });
  if (!validation.ok) {
    if (photo) await discardPendingReportPhoto(input.userId, photo.pathname);
    return { ok: false, errors: validation.errors, message: "Periksa kembali isian laporan." };
  }

  if (photo && !isOwnedReportPhotoPathname(photo.pathname, input.userId)) {
    return {
      ok: false,
      errors: { foto: "Foto laporan tidak valid. Silakan unggah ulang." },
      message: "Foto laporan tidak valid.",
    };
  }

  const facility = input.facilityId != null ? await findFacilityById(input.facilityId) : null;
  if (!facility || facility.status === "INACTIVE") {
    if (photo) await discardPendingReportPhoto(input.userId, photo.pathname);
    return {
      ok: false,
      errors: { facilityId: "Fasilitas yang dipilih tidak tersedia." },
      message: "Fasilitas yang dipilih tidak tersedia.",
    };
  }

  if (!photo) {
    return {
      ok: false,
      errors: { foto: "Foto wajib dilampirkan." },
      message: "Foto laporan gagal diunggah.",
    };
  }

  const existingPhoto = await findReportByFoto(photo.pathname);
  if (existingPhoto) {
    return {
      ok: false,
      errors: { foto: "Foto ini sudah digunakan pada laporan lain." },
      message: "Foto laporan tidak dapat digunakan kembali.",
    };
  }

  const verifiedPhoto = await verifyReportPhotoUpload(
    photo.pathname,
    input.userId,
    photo.contentType,
    photo.size,
  );
  if (!verifiedPhoto) {
    await discardPendingReportPhoto(input.userId, photo.pathname);
    return {
      ok: false,
      errors: { foto: "Isi foto tidak valid atau unggahan belum selesai. Silakan unggah ulang." },
      message: "Foto laporan gagal diverifikasi.",
    };
  }

  let row: ReportWithFacility;
  try {
    row = await createReportRow({
      userId: input.userId,
      facilityId: facility.id,
      kategori: input.kategori,
      deskripsi: input.deskripsi.trim(),
      foto: photo.pathname,
      fotoContentType: verifiedPhoto.contentType,
      fotoSize: verifiedPhoto.size,
    });
  } catch (error) {
    await discardPendingReportPhoto(input.userId, photo.pathname);
    throw error;
  }

  const handlers = await resolveHandlers([row]);
  return { ok: true, item: toReportItem(row, handlers) };
}

export async function discardPendingReportPhoto(userId: number, pathname: string) {
  if (!isOwnedReportPhotoPathname(pathname, userId)) return
  try {
    if (await findReportByFoto(pathname)) return
    await removeReportPhoto(pathname, userId)
  } catch {
    // Pembersihan bersifat best-effort dan tidak boleh menutupi kegagalan utama.
  }
}
