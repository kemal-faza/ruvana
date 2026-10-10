import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusLaporan } from "@/generated/prisma/enums";
import type { UrutanLaporan } from "@/lib/validation/report-processing";

const reportFacilitySelect = {
  id: true,
  nama: true,
  tipe: true,
  lokasi: true,
  kapasitas: true,
  status: true,
} satisfies Prisma.FacilitySelect;

// Opsi form laporan (REP-01): cukup identitas, nama, dan tipe untuk dipilih.
const reportFacilityOptionSelect = {
  id: true,
  nama: true,
  tipe: true,
} satisfies Prisma.FacilitySelect;

const reportUserSelect = {
  id: true,
  nama: true,
  role: true,
} satisfies Prisma.UserSelect;

const reportSelect = {
  id: true,
  facilityId: true,
  kategori: true,
  deskripsi: true,
  foto: true,
  status: true,
  catatanResolusi: true,
  ditanganiOleh: true,
  createdAt: true,
  updatedAt: true,
  facility: { select: reportFacilitySelect },
} satisfies Prisma.ReportSelect;

const staffReportPreviewSelect = {
  id: true,
  kategori: true,
  deskripsi: true,
  status: true,
  createdAt: true,
  facility: { select: { nama: true } },
} satisfies Prisma.ReportSelect;

// Select operasional petugas/admin (REP-03): seluruh field OpenAPI
// `StaffReport` termasuk metadata foto tanpa URL private dan provenance status
// fasilitas. Signed read URL tidak pernah dipersistensikan di respons.
const staffReportSelect = {
  id: true,
  kategori: true,
  deskripsi: true,
  foto: true,
  fotoContentType: true,
  fotoSize: true,
  status: true,
  catatanResolusi: true,
  ditanganiOleh: true,
  createdAt: true,
  waktuDiproses: true,
  user: {
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      status: true,
      waktuDaftar: true,
      waktuVerifikasi: true,
    },
  },
  facility: {
    select: {
      ...reportFacilitySelect,
      deskripsi: true,
      statusChangedAt: true,
      statusChangedBy: { select: { id: true, nama: true, role: true } },
    },
  },
} satisfies Prisma.ReportSelect;

export type ReportWithFacility = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;
export type StaffReportPreviewRow = Prisma.ReportGetPayload<{ select: typeof staffReportPreviewSelect }>;
export type StaffReportRow = Prisma.ReportGetPayload<{ select: typeof staffReportSelect }>;

// Client yang bisa membaca laporan beserta petugas penanganannya; transaksi
// REP-03 memakai instance ini agar lock dan pembacaan berada di koneksi sama.
type StaffReportClient = Pick<Prisma.TransactionClient, "report" | "user">;
type StaffReportHandlerClient = Pick<Prisma.TransactionClient, "user">;

interface FindReportsByUserParams {
  userId: number;
  skip: number;
  take: number;
}

export function findReportsByUser({ userId, skip, take }: FindReportsByUserParams) {
  return prisma.report.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: reportSelect,
    skip,
    take,
  });
}

export function countReportsByUser(userId: number, status?: StatusLaporan) {
  return prisma.report.count({
    where: { userId, ...(status ? { status } : {}) },
  });
}

export function findReportsByStatus({ status, skip, take }: { status: StatusLaporan; skip: number; take: number }) {
  return prisma.report.findMany({
    where: { status },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: staffReportPreviewSelect,
    skip,
    take,
  });
}

export function countStaffReportsByStatus(status: StatusLaporan) {
  return prisma.report.count({ where: { status } });
}

// Kunci baris laporan agar dua keputusan petugas atas id yang sama terserialisasi
// sebelum status dibaca (REP-03). Dipanggil di dalam transaksi.
export async function lockReportById(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw`SELECT id FROM "reports" WHERE id = ${id} FOR UPDATE`;
}

export interface FindStaffReportsParams {
  status: readonly StatusLaporan[];
  urut: UrutanLaporan;
  skip: number;
  take: number;
}

// Antrean laporan untuk petugas: createdAt lalu id terurut sesuai pilihan
// urutan antrean, sehingga laporan terlama selalu dapat ditemukan lebih dulu.
export function findStaffReports({ status, urut, skip, take }: FindStaffReportsParams) {
  const arah = urut === "terbaru" ? "desc" : "asc";
  return prisma.report.findMany({
    where: { status: { in: [...status] } },
    orderBy: [
      { createdAt: arah },
      { id: arah },
    ],
    select: staffReportSelect,
    skip,
    take,
  });
}

export function countStaffReports(status: readonly StatusLaporan[]) {
  return prisma.report.count({ where: { status: { in: [...status] } } });
}

export function findStaffReportById(id: number, client: StaffReportClient = prisma) {
  return client.report.findUnique({ where: { id }, select: staffReportSelect });
}

// Petugas penanganan disimpan sebagai id scalar; pemetaan ke `StaffUser`
// diambil terpisah agar respons tidak pernah menebak nama dari id.
export function findStaffReportHandlers(ids: number[], client: StaffReportHandlerClient = prisma) {
  if (ids.length === 0) return Promise.resolve([]);
  return client.user.findMany({ where: { id: { in: ids } }, select: reportUserSelect });
}

export function findUsersById(ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({ where: { id: { in: ids } }, select: reportUserSelect });
}

export function findFacilityById(id: number) {
  return prisma.facility.findFirst({ where: { id, deletedAt: null }, select: reportFacilitySelect });
}

export function createReport(data: {
  userId: number;
  facilityId: number;
  kategori: string;
  deskripsi: string;
  foto: string | null;
  fotoContentType: string | null;
  fotoSize: number | null;
}) {
  return prisma.report.create({
    data,
    select: reportSelect,
  });
}

export function findReportByFoto(foto: string) {
  return prisma.report.findUnique({ where: { foto }, select: { id: true } });
}

export function findReportPhotoById(id: number) {
  return prisma.report.findUnique({
    where: { id },
    select: { id: true, userId: true, foto: true, fotoContentType: true, fotoSize: true },
  });
}

/** Opsi fasilitas untuk form laporan: fasilitas yang masih terlihat publik (ACTIVE / UNDER_MAINTENANCE). */
export function findReportFacilityOptions() {
  return prisma.facility.findMany({
    where: { status: { in: ["ACTIVE", "UNDER_MAINTENANCE"] }, deletedAt: null },
    orderBy: { nama: "asc" },
    select: reportFacilityOptionSelect,
  });
}
