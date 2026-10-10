import { beforeEach, describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();
const count = vi.fn();
const findManyFacilities = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      groupBy: (...args: unknown[]) => (groupBy as (...a: unknown[]) => unknown)(...args),
      count: (...args: unknown[]) => (count as (...a: unknown[]) => unknown)(...args),
    },
    facility: {
      findMany: (...args: unknown[]) =>
        (findManyFacilities as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

import { getStaffMonthlyRecapService } from "./staff-monthly-recap";

const BULAN = "2026-09";

function mockRekapKosong() {
  groupBy.mockImplementation(() => Promise.resolve([]));
  count.mockImplementation(() => Promise.resolve(0));
  findManyFacilities.mockImplementation(() => Promise.resolve([]));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getStaffMonthlyRecapService", () => {
  it("mengelompokkan jumlah per status berdasarkan tanggal pemakaian dengan nol eksplisit", async () => {
    groupBy.mockImplementation((args: { by?: string[] }) =>
      args.by?.includes("status")
        ? Promise.resolve([
            { status: "PENDING", _count: { _all: 2 } },
            { status: "APPROVED", _count: { _all: 3 } },
          ])
        : Promise.resolve([]),
    );
    count.mockImplementation(() => Promise.resolve(0));
    findManyFacilities.mockImplementation(() => Promise.resolve([]));

    const rekap = await getStaffMonthlyRecapService(BULAN);

    expect(rekap.month).toBe(BULAN);
    expect(rekap.total).toBe(5);
    expect(rekap.perStatus).toHaveLength(7);
    expect(rekap.perStatus.find((item) => item.status === "CANCELLED_BY_MAINTENANCE")?.count).toBe(0);
    expect(rekap.perStatus.find((item) => item.status === "PENDING")?.count).toBe(2);
    expect(rekap.perStatus.find((item) => item.status === "APPROVED")?.count).toBe(3);
    expect(rekap.perStatus.find((item) => item.status === "REJECTED")?.count).toBe(0);
    expect(rekap.perStatus.find((item) => item.status === "EXPIRED")?.count).toBe(0);
    // Label domain Indonesia, bukan enum mentah.
    expect(rekap.perStatus.every((item) => item.label !== item.status)).toBe(true);
  });

  it("memfilter rentang bulan memakai kolom tanggal pemakaian (30 vs 1 bulan berikutnya)", async () => {
    mockRekapKosong();

    await getStaffMonthlyRecapService(BULAN);

    const panggilanStatus = groupBy.mock.calls.find((args) =>
      (args[0] as { by?: string[] }).by?.includes("status"),
    );
    expect(panggilanStatus).toBeDefined();
    const where = (panggilanStatus?.[0] as { where: { tanggal: { gte: Date; lt: Date } } }).where;
    // Batas setengah-terbuka: 1 September inklusif sampai 1 Oktober eksklusif,
    // sehingga tanggal 30 September masuk dan 1 Oktober tidak.
    expect(where.tanggal.gte).toEqual(new Date(Date.UTC(2026, 8, 1)));
    expect(where.tanggal.lt).toEqual(new Date(Date.UTC(2026, 9, 1)));
  });

  it("memetakan jumlah per fasilitas dengan nama dan urutan jumlah", async () => {
    groupBy.mockImplementation((args: { by?: string[] }) =>
      args.by?.includes("facilityId")
        ? Promise.resolve([
            { facilityId: 2, _count: { _all: 1 } },
            { facilityId: 1, _count: { _all: 4 } },
          ])
        : Promise.resolve([]),
    );
    count.mockImplementation(() => Promise.resolve(0));
    findManyFacilities.mockImplementation(() =>
      Promise.resolve([
        { id: 1, nama: "Aula Utama" },
        { id: 2, nama: "Ruang Kelas 1" },
      ]),
    );

    const rekap = await getStaffMonthlyRecapService(BULAN);

    expect(rekap.perFacility).toEqual([
      { facilityId: 1, facilityName: "Aula Utama", count: 4 },
      { facilityId: 2, facilityName: "Ruang Kelas 1", count: 1 },
    ]);
  });

  it("menampilkan nol bukan error untuk bulan tanpa data", async () => {
    mockRekapKosong();

    const rekap = await getStaffMonthlyRecapService("2026-02");

    expect(rekap.total).toBe(0);
    expect(rekap.perStatus.every((item) => item.count === 0)).toBe(true);
    expect(rekap.perFacility).toEqual([]);
    expect(rekap.trend).toHaveLength(6);
    expect(rekap.trend.every((item) => item.count === 0)).toBe(true);
  });

  it("menghitung tren 6 bulan termasuk pergantian tahun", async () => {
    groupBy.mockImplementation(() => Promise.resolve([]));
    findManyFacilities.mockImplementation(() => Promise.resolve([]));
    const jumlahPerBulan: Record<string, number> = {
      "2025-08": 0,
      "2025-09": 1,
      "2025-10": 2,
      "2025-11": 3,
      "2025-12": 4,
      "2026-01": 5,
    };
    count.mockImplementation((args: { where: { tanggal: { gte: Date } } }) => {
      const bulan = (args.where.tanggal.gte as Date).toISOString().slice(0, 7);
      return Promise.resolve(jumlahPerBulan[bulan] ?? 0);
    });

    const rekap = await getStaffMonthlyRecapService("2026-01");

    expect(rekap.trend.map((item) => item.month)).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
    expect(rekap.trend.map((item) => item.count)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(rekap.trend.every((item) => item.label.length > 0)).toBe(true);
  });

  it("menyertakan metodologi pengelompokan tanggal pemakaian", async () => {
    mockRekapKosong();

    const rekap = await getStaffMonthlyRecapService(BULAN);

    expect(rekap.methodology.timezone).toBe("Asia/Jakarta");
    expect(rekap.methodology.groupingRule).toMatch(/tanggal pemakaian/i);
  });
});
