import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTransaction = vi.fn();

// Mock prisma singleton — hanya yang dipakai service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => (mockTransaction as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

import { createReservationService } from "./reservation-service";
import { asiaJakartaToUtc, calendarDateToUtcMidnight } from "@/lib/time/reservation-time";

function makeTxMock(overrides: {
  facility?: { id: number; status: string; deletedAt?: Date | null } | null;
  overlapping?: Array<{ id: number; startTime: Date; endTime: Date }>;
  approvedOnDate?: Array<{ startTime: Date; endTime: Date }>;
  created?: unknown;
} = {}) {
  const facility = overrides.facility !== undefined ? overrides.facility : { id: 1, status: "ACTIVE" };
  const overlapping = overrides.overlapping ?? [];
  const approvedOnDate = overrides.approvedOnDate ?? [];
  const created = overrides.created ?? {
    id: 92,
    tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    startTime: asiaJakartaToUtc("2026-09-15", "09:00"),
    endTime: asiaJakartaToUtc("2026-09-15", "10:00"),
    tujuanPenggunaan: "Diskusi kelompok",
    status: "PENDING",
    alasan: null,
    createdAt: new Date("2026-09-09T03:20:00Z"),
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
  };

  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    facility: { findUnique: vi.fn().mockResolvedValue(facility) },
    reservation: {
      findMany: vi.fn().mockImplementation((args: { where: { status: string; tanggal?: unknown } }) => {
        // pertama untuk overlapping (status APPROVED + startTime lt), kedua untuk approvedOnDate (tanggal gte)
        if (args.where.tanggal) return Promise.resolve(approvedOnDate);
        return Promise.resolve(overlapping);
      }),
      create: vi.fn().mockResolvedValue(created),
    },
  };
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createReservationService", () => {
  const validInput = {
    facilityId: 1,
    date: "2026-09-15",
    startTime: "09:00",
    endTime: "10:00",
    tujuanPenggunaan: "Diskusi kelompok",
  };
  // ~15 hari sebelum slot uji: lolos batas pengajuan 14 hari (336 jam).
  const now = new Date("2026-08-31T03:00:00Z");

  it("membuat reservasi PENDING ketika valid dan tidak ada konflik", async () => {
    const tx = makeTxMock();
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));

    const result = await createReservationService(42, validInput, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(92);
      expect(result.data.status).toBe("PENDING");
      expect(result.data.facility.id).toBe(1);
      expect(result.data.date).toBe("2026-09-15");
      expect(result.data.timezone).toBe("Asia/Jakarta");
    }
    expect(tx.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tanggal: calendarDateToUtcMidnight(validInput.date) }) }),
    );
    expect(tx.$queryRaw).toHaveBeenCalled();
  });

  it("menolak slot yang sudah lewat (startsAt <= now)", async () => {
    const pastNow = new Date("2026-09-15T02:30:00Z"); // 09:30 Jakarta sama hari
    const input = { ...validInput, startTime: "09:00", endTime: "09:30" };
    const result = await createReservationService(42, input, pastNow);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("validation");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("menolak fasilitas INACTIVE / UNDER_MAINTENANCE", async () => {
    const tx = makeTxMock({ facility: { id: 1, status: "UNDER_MAINTENANCE" } });
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    const result = await createReservationService(42, validInput, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("validation");
  });

  it("menolak fasilitas tidak ditemukan", async () => {
    const tx = makeTxMock({ facility: null });
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    const result = await createReservationService(42, validInput, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
  });

  it("memperlakukan fasilitas terarsip (soft delete) seperti tidak ditemukan", async () => {
    const tx = makeTxMock({ facility: { id: 1, status: "ACTIVE", deletedAt: new Date("2026-10-10T00:00:00Z") } });
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    const result = await createReservationService(42, validInput, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
  });

  it("menolak bentrok dengan APPROVED (overlap) dan membawa availability", async () => {
    const overlapping = [{ id: 10, startTime: asiaJakartaToUtc("2026-09-15", "09:00"), endTime: asiaJakartaToUtc("2026-09-15", "10:00") }];
    const approvedOnDate = [{ startTime: asiaJakartaToUtc("2026-09-15", "09:00"), endTime: asiaJakartaToUtc("2026-09-15", "10:00") }];
    const tx = makeTxMock({ overlapping, approvedOnDate });
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));

    const result = await createReservationService(42, validInput, now);

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "conflict") {
      expect(result.error.availability).toBeDefined();
      const av = result.error.availability as { slots: Array<{ startTime: string; blockedBy: string | null }> };
      const slot = av.slots.find((s) => s.startTime === "09:00");
      expect(slot?.blockedBy).toBe("APPROVED");
    }
  });

  it("membolehkan overlap dengan PENDING (tidak dianggap konflik)", async () => {
    // overlapping array kosong menandakan tidak ada APPROVED, meski ada PENDING di DB (tidak di-query)
    const tx = makeTxMock({ overlapping: [] });
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    const result = await createReservationService(42, validInput, now);
    expect(result.ok).toBe(true);
  });

  it("melakukan row lock pada facilities via SELECT FOR UPDATE", async () => {
    const tx = makeTxMock();
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    await createReservationService(42, validInput, now);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("menerima pengajuan tepat 336 jam / 14 hari sebelum waktu mulai", async () => {
    const tx = makeTxMock();
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    // 09:00 WIB 15 Sep = 02:00 UTC; tepat 14 hari sebelumnya = 02:00 UTC 1 Sep.
    const tepat14Hari = new Date("2026-09-01T02:00:00.000Z");
    const result = await createReservationService(42, validInput, tepat14Hari);
    expect(result.ok).toBe(true);
  });

  it("menolak pengajuan 336 jam kurang 1 detik dengan galat batas pengajuan", async () => {
    const tx = makeTxMock();
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    const kurangSatuDetik = new Date("2026-09-01T02:00:01.000Z");
    const result = await createReservationService(42, validInput, kurangSatuDetik);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "validation") {
      const pesan = result.error.errors.map((e) => e.message).join(" ");
      expect(pesan).toContain("14 hari");
    } else {
      throw new Error("Seharusnya gagal validasi batas pengajuan 14 hari");
    }
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("menghitung batas pengajuan dari instant UTC lintas tanggal Asia/Jakarta (17.00 UTC = 00.00 WIB)", async () => {
    const tx = makeTxMock();
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    // 00.00 WIB 15 Sep = 17.00 UTC 14 Sep. Slot 07.00 WIB 5 Okt = 00.00 UTC 5 Okt.
    const tengahMalamWib = new Date("2026-09-14T17:00:00.000Z");
    const inputJauh = { ...validInput, date: "2026-10-05", startTime: "07:00", endTime: "07:30" };
    const lolos = await createReservationService(42, inputJauh, tengahMalamWib);
    expect(lolos.ok).toBe(true);

    // Slot 07.00 WIB 20 Sep = 00.00 UTC 20 Sep; selisih tinggal ~5 hari.
    const inputMepet = { ...validInput, date: "2026-09-20", startTime: "07:00", endTime: "07:30" };
    const mepet = await createReservationService(42, inputMepet, tengahMalamWib);
    expect(mepet.ok).toBe(false);
    if (!mepet.ok) expect(mepet.error.type).toBe("validation");
  });
});
