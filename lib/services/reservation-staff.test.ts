import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTransaction = vi.fn();
const findManyRoot = vi.fn();
const countRoot = vi.fn();
const updateManyRoot = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => (mockTransaction as unknown as (...a: unknown[]) => unknown)(...args),
    reservation: {
      findMany: (...args: unknown[]) => (findManyRoot as (...a: unknown[]) => unknown)(...args),
      count: (...args: unknown[]) => (countRoot as (...a: unknown[]) => unknown)(...args),
      updateMany: (...args: unknown[]) => (updateManyRoot as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

import {
  approveReservationService,
  cancelReservationByOfficerService,
  listStaffApprovedService,
  listStaffQueueService,
  rejectReservationService,
} from "./reservation-service";
import { parseCancelBody } from "@/lib/validation/reservation";
import { asiaJakartaToUtc } from "@/lib/time/reservation-time";

const now = new Date("2026-09-09T04:00:00Z");

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 92,
    userId: 42,
    facilityId: 1,
    tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    startTime: asiaJakartaToUtc("2026-09-15", "09:00"),
    endTime: asiaJakartaToUtc("2026-09-15", "10:00"),
    tujuanPenggunaan: "Diskusi kelompok",
    status: "PENDING",
    alasan: null,
    createdAt: new Date("2026-09-09T03:20:00Z"),
    waktuDiproses: null,
    diprosesOleh: null,
    facility: {
      id: 1,
      nama: "RK-101",
      tipe: "ruang_kelas",
      lokasi: "Gedung A Lt.1",
      kapasitas: 40,
      deskripsi: "Ruang kelas standar ber-AC",
      status: "ACTIVE",
    },
    user: {
      id: 42,
      nama: "Siti Aminah",
      email: "siti.aminah@example.com",
      role: "pengguna",
      status: "ACTIVE",
      waktuDaftar: new Date("2026-09-01T02:00:00Z"),
      waktuVerifikasi: new Date("2026-09-02T04:00:00Z"),
    },
    ...overrides,
  };
}

const actor = { id: 7, nama: "Petugas Ruvana", role: "petugas" };

function mockTx(opts: {
  row?: Record<string, unknown> | null;
  facilityStatus?: string;
  overlapping?: Array<Record<string, unknown>>;
  approvedOnDate?: Array<Record<string, unknown>>;
} = {}) {
  const row = opts.row === undefined ? makeRow() : opts.row;
  const reservation = {
    findUnique: vi.fn().mockResolvedValue(row),
    findMany: vi.fn().mockImplementation((args: { where: { tanggal?: unknown } }) => {
      if (args.where.tanggal) return Promise.resolve(opts.approvedOnDate ?? []);
      return Promise.resolve(opts.overlapping ?? []);
    }),
    update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...(row as object), ...args.data }),
    ),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const facility = {
    findUnique: vi.fn().mockResolvedValue(
      row ? { id: 1, status: opts.facilityStatus ?? "ACTIVE" } : null,
    ),
  };
  const user = { findUnique: vi.fn().mockResolvedValue(actor) };
  const $queryRaw = vi.fn().mockResolvedValue([]);
  mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) =>
    fn({ reservation, facility, user, $queryRaw }),
  );
  return { reservation, facility, user, $queryRaw };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("approveReservationService", () => {
  it("menyetujui PENDING dan mencatat aktor serta waktu tepat satu kali", async () => {
    const { reservation, $queryRaw } = mockTx();

    const result = await approveReservationService(7, 92, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("APPROVED");
      expect(result.data.processedBy).toEqual(actor);
      expect(result.data.processedAt).toBe(now.toISOString());
      expect(result.data.pemohon.nama).toBe("Siti Aminah");
    }
    // Row lock fasilitas dipegang sebelum final check
    expect($queryRaw).toHaveBeenCalled();
    expect(reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 92 },
        data: expect.objectContaining({ status: "APPROVED", diprosesOleh: 7, waktuDiproses: now }),
      }),
    );
  });

  it("menjalankan expiry idempoten sebelum membaca baris saat approve", async () => {
    const { reservation } = mockTx();

    await approveReservationService(7, 92, now);

    const updateMany = vi.mocked(reservation.updateMany);
    const findUnique = vi.mocked(reservation.findUnique);
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: now } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(findUnique.mock.invocationCallOrder[0]);
  });

  it("menolak approve yang bentrok tanpa perubahan dan membawa availability", async () => {
    const overlapping = [
      { id: 10, startTime: asiaJakartaToUtc("2026-09-15", "09:00"), endTime: asiaJakartaToUtc("2026-09-15", "10:00") },
    ];
    const { reservation } = mockTx({ overlapping, approvedOnDate: overlapping });

    const result = await approveReservationService(7, 92, now);

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "conflict") {
      expect(result.error.availability).toBeDefined();
      const av = result.error.availability as { slots: Array<{ startTime: string; blockedBy: string | null }> };
      expect(av.slots.find((s) => s.startTime === "09:00")?.blockedBy).toBe("APPROVED");
    } else {
      expect.unreachable("harusnya conflict");
    }
    expect(reservation.update).not.toHaveBeenCalled();
  });

  it("menolak approve atas status non-PENDING", async () => {
    const { reservation } = mockTx({ row: makeRow({ status: "APPROVED" }) });

    const result = await approveReservationService(7, 92, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(reservation.update).not.toHaveBeenCalled();
  });

  it("mengembalikan not_found untuk id yang tidak ada", async () => {
    mockTx({ row: null });

    const result = await approveReservationService(7, 999, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
  });
});

describe("rejectReservationService", () => {
  it("menolak PENDING dengan alasan wajib dan mencatat aktor", async () => {
    const { reservation } = mockTx();

    const result = await rejectReservationService(7, 92, { alasan: "Kapasitas tidak cukup" }, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("REJECTED");
      expect(result.data.alasan).toBe("Kapasitas tidak cukup");
      expect(result.data.processedBy).toEqual(actor);
    }
    expect(reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", alasan: "Kapasitas tidak cukup" }),
      }),
    );
  });

  it("menolak reject atas status non-PENDING", async () => {
    const { reservation } = mockTx({ row: makeRow({ status: "CANCELLED_BY_USER" }) });

    const result = await rejectReservationService(7, 92, { alasan: "x" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(reservation.update).not.toHaveBeenCalled();
  });

  it("menolak reject tanpa alasan di validation layer", () => {
    for (const body of [{}, { alasan: "   " }, { alasan: 123 }]) {
      const r = parseCancelBody(body);
      expect(r.ok).toBe(false);
    }
    const r = parseCancelBody({ alasan: "Tidak memenuhi syarat" });
    expect(r.ok).toBe(true);
  });
});

describe("cancelReservationByOfficerService", () => {
  it("membatalkan APPROVED dengan alasan, aktor, dan waktu", async () => {
    const { reservation } = mockTx({ row: makeRow({ status: "APPROVED" }) });

    const result = await cancelReservationByOfficerService(7, 92, { alasan: "Gedung ditutup darurat" }, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("CANCELLED_BY_OFFICER");
      expect(result.data.alasan).toBe("Gedung ditutup darurat");
      expect(result.data.processedBy).toEqual(actor);
      expect(result.data.processedAt).toBe(now.toISOString());
    }
    expect(reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 92 },
        data: expect.objectContaining({
          status: "CANCELLED_BY_OFFICER",
          alasan: "Gedung ditutup darurat",
          diprosesOleh: 7,
          waktuDiproses: now,
        }),
      }),
    );
  });

  it("menolak status selain APPROVED", async () => {
    for (const status of ["PENDING", "REJECTED", "CANCELLED_BY_USER", "CANCELLED_BY_OFFICER", "EXPIRED"]) {
      const { reservation } = mockTx({ row: makeRow({ status }) });
      const result = await cancelReservationByOfficerService(7, 92, { alasan: "x" }, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe("transition");
      expect(reservation.update).not.toHaveBeenCalled();
    }
  });

  it("mengembalikan not_found untuk id yang tidak ada", async () => {
    mockTx({ row: null });

    const result = await cancelReservationByOfficerService(7, 999, { alasan: "x" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
  });

  it("menolak tanpa alasan di validation layer", () => {
    for (const body of [{}, { alasan: "   " }]) {
      expect(parseCancelBody(body).ok).toBe(false);
    }
  });
});

describe("listStaffQueueService", () => {
  it("menjalankan expiry sebelum membaca antrean agar yang basi tidak tampil", async () => {
    findManyRoot.mockResolvedValue([]);
    countRoot.mockResolvedValue(0);

    await listStaffQueueService({ page: 1, perPage: 20 });

    expect(updateManyRoot).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: expect.any(Date) } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(updateManyRoot.mock.invocationCallOrder[0]).toBeLessThan(findManyRoot.mock.invocationCallOrder[0]);
  });

  it("mengembalikan PENDING terlama dulu beserta pemohon dan meta", async () => {
    findManyRoot.mockResolvedValue([makeRow(), makeRow({ id: 93 })]);
    countRoot.mockResolvedValue(2);

    const result = await listStaffQueueService({ page: 1, perPage: 20 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((i) => i.id)).toEqual([92, 93]);
      expect(result.data.items[0].pemohon.email).toBe("siti.aminah@example.com");
      expect(result.data.items[0].processedBy).toBeNull();
      expect(result.data.meta).toEqual({ page: 1, perPage: 20, totalItems: 2, totalPages: 1 });
    }
    expect(findManyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  });
});

describe("listStaffApprovedService", () => {
  it("mengembalikan APPROVED urut waktu mulai terdekat beserta pemohon dan meta", async () => {
    findManyRoot.mockResolvedValue([makeRow({ status: "APPROVED" }), makeRow({ id: 93, status: "APPROVED" })]);
    countRoot.mockResolvedValue(2);

    const result = await listStaffApprovedService({ page: 1, perPage: 20 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((i) => i.id)).toEqual([92, 93]);
      expect(result.data.items.every((i) => i.status === "APPROVED")).toBe(true);
      expect(result.data.items[0].pemohon.email).toBe("siti.aminah@example.com");
      expect(result.data.items[0].processedBy).toBeNull();
      expect(result.data.meta).toEqual({ page: 1, perPage: 20, totalItems: 2, totalPages: 1 });
    }
    expect(findManyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "APPROVED" },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("memakai skip/take dari paginasi", async () => {
    findManyRoot.mockResolvedValue([]);
    countRoot.mockResolvedValue(0);

    await listStaffApprovedService({ page: 3, perPage: 5 });

    expect(findManyRoot).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 5 }));
  });
});
