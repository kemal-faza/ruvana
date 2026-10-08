import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCount, mockFindMany, mockFindUnique, mockUserFindMany } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: { count: mockCount, findMany: mockFindMany, findUnique: mockFindUnique },
    user: { findMany: mockUserFindMany },
  },
}));

import {
  countStaffReports,
  countStaffReportsByStatus,
  findReportsByStatus,
  findStaffReportById,
  findStaffReportHandlers,
  findStaffReports,
  lockReportById,
} from "./reports";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("kueri pekerjaan laporan Petugas", () => {
  it("mengambil laporan untuk suatu status dari seluruh pemilik, terbaru lebih dahulu", () => {
    findReportsByStatus({ status: "IN_PROGRESS", skip: 0, take: 3 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "IN_PROGRESS" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 3,
      }),
    );
    const [query] = mockFindMany.mock.calls[0] as [{ where: Record<string, unknown>; select: Record<string, unknown> }];
    expect(query.where).not.toHaveProperty("userId");
    expect(query.select).not.toHaveProperty("foto");
  });

  it("menghitung status lintas pemilik", () => {
    countStaffReportsByStatus("NEW");

    expect(mockCount).toHaveBeenCalledWith({ where: { status: "NEW" } });
  });
});

describe("kueri antrean laporan petugas", () => {
  it("menyaring status antrean dan mengurutkan sesuai pilihan", () => {
    findStaffReports({ status: ["RESOLVED", "REJECTED"], urut: "terbaru", skip: 20, take: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["RESOLVED", "REJECTED"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it("memakai arah menaik untuk urutan terlama", () => {
    findStaffReports({ status: ["NEW"], urut: "terlama", skip: 0, take: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    );
  });

  it("membaca metadata foto dan provenance tanpa menyeleksi kolom lain", () => {
    findStaffReports({ status: ["NEW"], urut: "terlama", skip: 0, take: 20 });

    const [query] = mockFindMany.mock.calls[0] as [{ select: Record<string, unknown> }];
    expect(query.select).toMatchObject({
      fotoContentType: true,
      fotoSize: true,
      ditanganiOleh: true,
      waktuDiproses: true,
    });
    // Pathname private dibaca hanya agar service dapat menurunkan metadata foto.
    expect(query.select).toHaveProperty("foto", true);
  });

  it("menghitung total antrean dengan filter status yang sama", () => {
    countStaffReports(["NEW", "IN_PROGRESS"]);

    expect(mockCount).toHaveBeenCalledWith({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } });
  });
});

describe("kueri detail laporan petugas", () => {
  it("membaca satu laporan beserta pelapor dan fasilitasnya", () => {
    findStaffReportById(15);

    expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 15 } }));
  });

  it("memakai client transaksi agar lock dan pembacaan berada di koneksi sama", () => {
    const client = { report: { findUnique: vi.fn() }, user: { findMany: vi.fn() } };

    findStaffReportById(15, client as never);

    expect(client.report.findUnique).toHaveBeenCalledOnce();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("mengunci baris laporan dengan SELECT ... FOR UPDATE", async () => {
    const client = { $queryRaw: vi.fn().mockResolvedValue([]) };

    await lockReportById(client as never, 15);

    const [strings, id] = client.$queryRaw.mock.calls[0] as unknown as [string[], number];
    expect(strings.join("?")).toContain('FROM "reports"');
    expect(strings.join("?")).toContain("FOR UPDATE");
    expect(id).toBe(15);
  });

  it("tidak menyentuh database ketika tidak ada petugas penanganan", async () => {
    await expect(findStaffReportHandlers([])).resolves.toEqual([]);

    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("memetakan petugas penanganan dari kumpulan id", async () => {
    await findStaffReportHandlers([7, 9]);

    expect(mockUserFindMany).toHaveBeenCalledWith({
      where: { id: { in: [7, 9] } },
      select: { id: true, nama: true, role: true },
    });
  });
});
