import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const updateMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      count: (...args: unknown[]) => (count as (...a: unknown[]) => unknown)(...args),
      updateMany: (...args: unknown[]) => (updateMany as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

import {
  getStaffReservationSummaryService,
  sedangBerlangsung,
} from "./reservation-summary";

const SEKARANG = new Date("2026-10-01T02:00:00.000Z");

// Jumlah per kelompok sesuai RES-10. Slot uji memakai tanggal jauh di masa
// depan (imun aturan pengajuan H-14); batas mulai/selesai diuji lewat
// helper murni `sedangBerlangsung` di bawah.
function mockHitung(jumlah: {
  menunggu: number;
  disetujui: number;
  berlangsung: number;
  ditolak: number;
  lainnya: number;
}) {
  count.mockImplementation((args: { where?: Record<string, unknown> }) => {
    const where = args.where ?? {};
    if (where.status === "PENDING") return Promise.resolve(jumlah.menunggu);
    if (where.status === "REJECTED") return Promise.resolve(jumlah.ditolak);
    if (
      where.status === "APPROVED" &&
      typeof where.startTime !== "undefined"
    ) {
      return Promise.resolve(jumlah.berlangsung);
    }
    if (where.status === "APPROVED") return Promise.resolve(jumlah.disetujui);
    if (
      where.status &&
      typeof where.status === "object" &&
      "in" in (where.status as Record<string, unknown>)
    ) {
      return Promise.resolve(jumlah.lainnya);
    }
    return Promise.resolve(0);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMany.mockResolvedValue({ count: 0 });
});

describe("getStaffReservationSummaryService", () => {
  it("mengelompokkan jumlah menunggu, disetujui, ditolak, dan lainnya", async () => {
    mockHitung({ menunggu: 3, disetujui: 5, berlangsung: 2, ditolak: 1, lainnya: 4 });

    const ringkasan = await getStaffReservationSummaryService(SEKARANG);

    expect(ringkasan.menunggu).toBe(3);
    expect(ringkasan.disetujui).toBe(5);
    expect(ringkasan.sedangBerlangsung).toBe(2);
    expect(ringkasan.ditolak).toBe(1);
    expect(ringkasan.lainnya).toBe(4);
  });

  it("total kelompok selalu sama dengan seluruh reservasi", async () => {
    mockHitung({ menunggu: 3, disetujui: 5, berlangsung: 2, ditolak: 1, lainnya: 4 });

    const ringkasan = await getStaffReservationSummaryService(SEKARANG);

    expect(ringkasan.total).toBe(3 + 5 + 1 + 4);
  });

  it("menjalankan expiry idempoten sebelum penghitungan", async () => {
    mockHitung({ menunggu: 0, disetujui: 0, berlangsung: 0, ditolak: 0, lainnya: 0 });

    await getStaffReservationSummaryService(SEKARANG);

    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: SEKARANG } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      count.mock.invocationCallOrder[0],
    );
  });

  it("menghitung disetujui yang sedang berlangsung dengan batas mulai inklusif dan selesai eksklusif", async () => {
    mockHitung({ menunggu: 0, disetujui: 0, berlangsung: 0, ditolak: 0, lainnya: 0 });

    await getStaffReservationSummaryService(SEKARANG);

    expect(count).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        startTime: { lte: SEKARANG },
        endTime: { gt: SEKARANG },
      },
    });
  });

  it("menghitung lainnya dari dibatalkan pengguna, dibatalkan petugas, dan kedaluwarsa", async () => {
    mockHitung({ menunggu: 0, disetujui: 0, berlangsung: 0, ditolak: 0, lainnya: 6 });

    const ringkasan = await getStaffReservationSummaryService(SEKARANG);

    expect(count).toHaveBeenCalledWith({
      where: {
        status: { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OFFICER", "EXPIRED"] },
      },
    });
    expect(ringkasan.lainnya).toBe(6);
  });
});

describe("sedangBerlangsung", () => {
  it("benar tepat pada instant mulai (mulai <= sekarang)", () => {
    const mulai = new Date("2026-10-01T02:00:00.000Z");
    const selesai = new Date("2026-10-01T03:00:00.000Z");

    expect(sedangBerlangsung(mulai, selesai, mulai)).toBe(true);
  });

  it("salah tepat pada instant selesai (sekarang < selesai)", () => {
    const mulai = new Date("2026-10-01T02:00:00.000Z");
    const selesai = new Date("2026-10-01T03:00:00.000Z");

    expect(sedangBerlangsung(mulai, selesai, selesai)).toBe(false);
  });

  it("benar di tengah rentang dan salah di luar rentang", () => {
    const mulai = new Date("2026-10-01T02:00:00.000Z");
    const selesai = new Date("2026-10-01T03:00:00.000Z");

    expect(sedangBerlangsung(mulai, selesai, new Date("2026-10-01T02:30:00.000Z"))).toBe(true);
    expect(sedangBerlangsung(mulai, selesai, new Date("2026-10-01T01:59:59.000Z"))).toBe(false);
    expect(sedangBerlangsung(mulai, selesai, new Date("2026-10-01T03:00:01.000Z"))).toBe(false);
  });
});
