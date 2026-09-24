import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const count = vi.fn();
const findFirst = vi.fn();
const updateMany = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findMany: (...args: unknown[]) => (findMany as (...a: unknown[]) => unknown)(...args),
      count: (...args: unknown[]) => (count as (...a: unknown[]) => unknown)(...args),
      findFirst: (...args: unknown[]) => (findFirst as (...a: unknown[]) => unknown)(...args),
      updateMany: (...args: unknown[]) => (updateMany as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

import { getMyReservationService, listMyReservationsService } from "./reservation-service";
import { asiaJakartaToUtc } from "@/lib/time/reservation-time";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 91,
    tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    startTime: asiaJakartaToUtc("2026-09-15", "09:00"),
    endTime: asiaJakartaToUtc("2026-09-15", "10:00"),
    tujuanPenggunaan: "Diskusi kelompok",
    status: "APPROVED",
    alasan: null,
    createdAt: new Date("2026-09-09T03:00:00Z"),
    waktuDiproses: new Date("2026-09-09T04:00:00Z"),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listMyReservationsService", () => {
  it("menjalankan expiry sebelum membaca riwayat agar status terkini tampil", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await listMyReservationsService(42, { page: 1, perPage: 20 });

    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: expect.any(Date) } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
  });

  it("mengembalikan item milik pengguna beserta meta pagination", async () => {
    findMany.mockResolvedValue([makeRow(), makeRow({ id: 90, status: "PENDING" })]);
    count.mockResolvedValue(2);

    const result = await listMyReservationsService(42, { page: 1, perPage: 20 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].id).toBe(91);
      expect(result.data.items[0].facility.nama).toBe("RK-101");
      expect(result.data.items[0].date).toBe("2026-09-15");
      expect(result.data.items[0].startTime).toBe("09:00");
      expect(result.data.meta).toEqual({ page: 1, perPage: 20, totalItems: 2, totalPages: 1 });
    }
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 42 },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 20,
      }),
    );
  });

  it("meneruskan filter status dan menghitung offset halaman", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    const result = await listMyReservationsService(42, { page: 3, perPage: 10, status: "PENDING" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toEqual([]);
      expect(result.data.meta).toEqual({ page: 3, perPage: 10, totalItems: 0, totalPages: 0 });
    }
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 42, status: "PENDING" }, skip: 20, take: 10 }),
    );
  });
});

describe("getMyReservationService", () => {
  it("mengembalikan detail lengkap termasuk alasan", async () => {
    findFirst.mockResolvedValue(makeRow({ status: "REJECTED", alasan: "Ruangan dipakai rapat jurusan" }));

    const result = await getMyReservationService(42, 91);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(91);
      expect(result.data.status).toBe("REJECTED");
      expect(result.data.alasan).toBe("Ruangan dipakai rapat jurusan");
      expect(result.data.tujuanPenggunaan).toBe("Diskusi kelompok");
    }
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 91, userId: 42 } }),
    );
  });

  it("memasking baris hilang/milik orang lain sebagai not_found", async () => {
    findFirst.mockResolvedValue(null);

    const result = await getMyReservationService(42, 999);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
  });
});
