import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  countStaffReports,
  findStaffReportById,
  findStaffReportHandlers,
  findStaffReports,
  type StaffReportRow,
} from "@/lib/db/reports";
import { prisma } from "@/lib/prisma";

import {
  getStaffReportService,
  listStaffReportQueueService,
  rejectStaffReportService,
  resolveStaffReportService,
  startStaffReportService,
} from "./report-processing-service";

vi.mock("@/lib/db/reports", () => ({
  countStaffReports: vi.fn(),
  findStaffReportById: vi.fn(),
  findStaffReportHandlers: vi.fn(async () => []),
  findStaffReports: vi.fn(),
  lockReportById: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

const row: StaffReportRow = {
  id: 15,
  kategori: "Listrik",
  deskripsi: "Lampu sisi kanan tidak menyala.",
  foto: "reports/42/8b7c2d1e.png",
  fotoContentType: "image/png",
  fotoSize: 245_760,
  status: "NEW",
  catatanResolusi: null,
  ditanganiOleh: null,
  createdAt: new Date("2026-09-09T03:35:00.000Z"),
  waktuDiproses: null,
  user: {
    id: 42,
    nama: "Siti Aminah",
    email: "siti.aminah@example.com",
    role: "pengguna",
    status: "ACTIVE",
    waktuDaftar: new Date("2026-09-01T02:00:00.000Z"),
    waktuVerifikasi: new Date("2026-09-02T04:00:00.000Z"),
  },
  facility: {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: "Ruang kelas standar ber-AC",
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedBy: null,
  },
};

/**
 * Transaksi tiruan: `reads` adalah hasil pembacaan berurutan (baris sebelum
 * transisi, lalu baris sesudahnya). tx hanya memerlukan report.updateMany.
 */
function mockTransaction(reads: (StaffReportRow | null)[]) {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  let cursor = 0;
  vi.mocked(findStaffReportById).mockImplementation(
    () => Promise.resolve(reads[cursor++] ?? null) as ReturnType<typeof findStaffReportById>,
  );
  vi.mocked(prisma.$transaction).mockImplementation((callback) =>
    callback({ report: { updateMany } } as never),
  );
  return { updateMany };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listStaffReportQueueService", () => {
  it("antrean masuk hanya meminta status NEW", async () => {
    vi.mocked(findStaffReports).mockResolvedValue([]);
    vi.mocked(countStaffReports).mockResolvedValue(0);

    await listStaffReportQueueService({ queue: "intake", urut: "terlama", page: 1, perPage: 20 });

    expect(findStaffReports).toHaveBeenCalledWith({ status: ["NEW"], urut: "terlama", skip: 0, take: 20 });
    expect(countStaffReports).toHaveBeenCalledWith(["NEW"]);
  });

  it("daftar pekerjaan meminta NEW dan IN_PROGRESS", async () => {
    vi.mocked(findStaffReports).mockResolvedValue([]);
    vi.mocked(countStaffReports).mockResolvedValue(0);

    await listStaffReportQueueService({ queue: "work", urut: "terlama", page: 2, perPage: 10 });

    expect(findStaffReports).toHaveBeenCalledWith({
      status: ["NEW", "IN_PROGRESS"],
      urut: "terlama",
      skip: 10,
      take: 10,
    });
  });

  it("antrean riwayat meminta laporan terminal saja", async () => {
    vi.mocked(findStaffReports).mockResolvedValue([]);
    vi.mocked(countStaffReports).mockResolvedValue(0);

    await listStaffReportQueueService({ queue: "riwayat", urut: "terbaru", page: 1, perPage: 20 });

    expect(findStaffReports).toHaveBeenCalledWith({
      status: ["RESOLVED", "REJECTED"],
      urut: "terbaru",
      skip: 0,
      take: 20,
    });
    expect(countStaffReports).toHaveBeenCalledWith(["RESOLVED", "REJECTED"]);
  });

  it("tidak pernah mengembalikan pathname foto private", async () => {
    vi.mocked(findStaffReports).mockResolvedValue([row]);
    vi.mocked(countStaffReports).mockResolvedValue(1);

    const result = await listStaffReportQueueService({ queue: "intake", urut: "terlama", page: 1, perPage: 20 });

    expect(result.items[0].foto).toEqual({
      hasPhoto: true,
      contentType: "image/png",
      size: 245_760,
    });
    expect(JSON.stringify(result)).not.toContain("reports/42/");
  });

  it("memetakan id petugas penanganan menjadi objek pengguna", async () => {
    vi.mocked(findStaffReports).mockResolvedValue([{ ...row, ditanganiOleh: 7 }]);
    vi.mocked(countStaffReports).mockResolvedValue(1);
    vi.mocked(findStaffReportHandlers).mockResolvedValue([
      { id: 7, nama: "Petugas Ruvana", role: "petugas" },
    ]);

    const result = await listStaffReportQueueService({ queue: "work", urut: "terlama", page: 1, perPage: 20 });

    expect(findStaffReportHandlers).toHaveBeenCalledWith([7], expect.anything());
    expect(result.items[0].ditanganiOleh).toEqual({ id: 7, nama: "Petugas Ruvana", role: "petugas" });
  });
});

describe("getStaffReportService", () => {
  it("memetakan waktu pemrosesan dan petugas penanganan", async () => {
    vi.mocked(findStaffReportById).mockResolvedValue({
      ...row,
      status: "IN_PROGRESS",
      ditanganiOleh: 7,
      waktuDiproses: new Date("2026-09-09T05:00:00.000Z"),
    });
    vi.mocked(findStaffReportHandlers).mockResolvedValue([
      { id: 7, nama: "Petugas Ruvana", role: "petugas" },
    ]);

    const result = await getStaffReportService(15);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("IN_PROGRESS");
      expect(result.data.processedAt).toBe("2026-09-09T05:00:00.000Z");
      expect(result.data.ditanganiOleh).toEqual({ id: 7, nama: "Petugas Ruvana", role: "petugas" });
    }
  });

  it("menyembunyikan laporan yang tidak ada sebagai not_found", async () => {
    vi.mocked(findStaffReportById).mockResolvedValue(null);
    const result = await getStaffReportService(999);
    expect(result).toEqual({ ok: false, error: { type: "not_found", message: "Laporan tidak ditemukan" } });
  });
});

describe("transisi status laporan", () => {
  it("memulai penanganan menyimpan status, aktor, dan waktu server", async () => {
    const { updateMany } = mockTransaction([
      row,
      { ...row, status: "IN_PROGRESS", ditanganiOleh: 7, waktuDiproses: new Date("2026-09-09T05:00:00.000Z") },
    ]);
    const now = new Date("2026-09-09T05:00:00.000Z");

    const result = await startStaffReportService(7, 15, now);

    expect(result.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 15, status: "NEW" },
      data: { status: "IN_PROGRESS", ditanganiOleh: 7, waktuDiproses: now },
    });
  });

  it("menyelesaikan laporan memakai catatan dan waktu yang sama", async () => {
    const now = new Date("2026-09-10T06:00:00.000Z");
    const { updateMany } = mockTransaction([
      { ...row, status: "IN_PROGRESS" },
      {
        ...row,
        status: "RESOLVED",
        catatanResolusi: "Lampu diganti dan diuji.",
        ditanganiOleh: 7,
        waktuDiproses: now,
      },
    ]);

    const result = await resolveStaffReportService(7, 15, "Lampu diganti dan diuji.", now);

    expect(result.ok).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 15, status: "IN_PROGRESS" },
      data: {
        status: "RESOLVED",
        ditanganiOleh: 7,
        waktuDiproses: now,
        catatanResolusi: "Lampu diganti dan diuji.",
      },
    });
  });

  it("menolak laporan terminal dengan transition tanpa mengubah data", async () => {
    const { updateMany } = mockTransaction([{ ...row, status: "REJECTED", catatanResolusi: "Ditolak." }, null]);

    const result = await rejectStaffReportService(7, 15, "Tidak dapat diverifikasi.");

    expect(result).toMatchObject({ ok: false, error: { type: "transition" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("menolak pembukaan kembali status terminal", async () => {
    const { updateMany } = mockTransaction([
      { ...row, status: "RESOLVED", catatanResolusi: "Selesai." },
      null,
    ]);

    const result = await startStaffReportService(7, 15);

    expect(result).toMatchObject({ ok: false, error: { type: "transition" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("menyembunyikan laporan yang tidak ada saat transisi", async () => {
    mockTransaction([null]);

    const result = await startStaffReportService(7, 999);

    expect(result).toEqual({ ok: false, error: { type: "not_found", message: "Laporan tidak ditemukan" } });
  });
});