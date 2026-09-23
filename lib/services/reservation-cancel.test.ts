import { beforeEach, describe, expect, it, vi } from "vitest";

import { BATAS_PEMBATALAN_JAM } from "@/config/business";

const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => (mockTransaction as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

import { cancelMyReservationService } from "./reservation-service";

const now = new Date("2026-09-09T03:00:00Z");
const LIMIT_MS = BATAS_PEMBATALAN_JAM * 60 * 60 * 1000;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 91,
    userId: 42,
    tanggal: new Date("2026-09-14T17:00:00Z"),
    startTime: new Date(now.getTime() + 5 * 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    tujuanPenggunaan: "Diskusi kelompok",
    status: "PENDING",
    alasan: null,
    createdAt: new Date("2026-09-09T02:00:00Z"),
    waktuDiproses: null,
    facility: {
      id: 1,
      nama: "RK-101",
      tipe: "ruang_kelas",
      lokasi: "Gedung A Lt.1",
      kapasitas: 40,
      deskripsi: "Ruang kelas standar ber-AC",
      status: "ACTIVE",
    },
    ...overrides,
  };
}

function mockTx(row: Record<string, unknown> | null) {
  const findFirst = vi.fn().mockResolvedValue(row);
  const update = vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...(row as object), ...args.data }),
  );
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const tx = { reservation: { findFirst, update, updateMany } };
  mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
  return { findFirst, update, updateMany };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancelMyReservationService", () => {
  it("menjalankan expiry idempoten sebelum membaca baris", async () => {
    const { findFirst, updateMany } = mockTx(makeRow());

    await cancelMyReservationService(42, 91, { alasan: "Jadwal berubah" }, now);

    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: now } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(findFirst.mock.invocationCallOrder[0]);
  });

  it("membatalkan reservasi PENDING milik sendiri", async () => {
    const { update } = mockTx(makeRow());

    const result = await cancelMyReservationService(42, 91, { alasan: "Jadwal berubah" }, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("CANCELLED_BY_USER");
      expect(result.data.alasan).toBe("Jadwal berubah");
    }
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 91 },
        data: expect.objectContaining({ status: "CANCELLED_BY_USER", alasan: "Jadwal berubah" }),
      }),
    );
  });

  it("membatalkan reservasi APPROVED (slot ikut bebas via status)", async () => {
    mockTx(makeRow({ status: "APPROVED" }));

    const result = await cancelMyReservationService(42, 91, { alasan: "Acara dibatalkan" }, now);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("CANCELLED_BY_USER");
  });

  it("memasking baris hilang/milik orang lain sebagai not_found", async () => {
    const { update } = mockTx(null);

    const result = await cancelMyReservationService(42, 999, { alasan: "x" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
    expect(update).not.toHaveBeenCalled();
  });

  it("menolak status terminal/bukan PENDING-APPROVED", async () => {
    for (const status of ["REJECTED", "CANCELLED_BY_USER", "CANCELLED_BY_OFFICER", "EXPIRED"]) {
      const { update } = mockTx(makeRow({ status }));
      const result = await cancelMyReservationService(42, 91, { alasan: "x" }, now);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("transition");
        expect(update).not.toHaveBeenCalled();
      }
    }
  });

  it("mengizinkan tepat di batas waktu", async () => {
    mockTx(makeRow({ startTime: new Date(now.getTime() + LIMIT_MS) }));

    const result = await cancelMyReservationService(42, 91, { alasan: "x" }, now);

    expect(result.ok).toBe(true);
  });

  it("mengizinkan jauh sebelum batas waktu", async () => {
    mockTx(makeRow({ startTime: new Date(now.getTime() + LIMIT_MS + 60_000) }));

    const result = await cancelMyReservationService(42, 91, { alasan: "x" }, now);

    expect(result.ok).toBe(true);
  });

  it("menolak sesaat setelah melewati batas waktu", async () => {
    const { update } = mockTx(makeRow({ startTime: new Date(now.getTime() + LIMIT_MS - 1_000) }));

    const result = await cancelMyReservationService(42, 91, { alasan: "x" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("transition");
      if (result.error.type === "transition") {
        expect(result.error.message).toContain("Hubungi petugas");
      }
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("menolak saat kurang dari batas dan saat sudah lewat", async () => {
    for (const startTime of [
      new Date(now.getTime() + 60 * 60 * 1000),
      new Date(now.getTime() - 60 * 60 * 1000),
    ]) {
      mockTx(makeRow({ startTime }));
      const result = await cancelMyReservationService(42, 91, { alasan: "x" }, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe("transition");
    }
  });
});
