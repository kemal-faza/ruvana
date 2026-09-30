import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTransaction = vi.fn();
const mockHandleFacilityStatusChanged = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => (mockTransaction as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

vi.mock("@/lib/reservations/maintenance-listener", () => ({
  handleFacilityStatusChanged: (...args: unknown[]) =>
    (mockHandleFacilityStatusChanged as unknown as (...a: unknown[]) => unknown)(...args),
}));

import { updateFacilityOperationalStatusService } from "./facility-status-service";

const now = new Date("2026-09-30T05:00:00Z");
const petugas = { id: 7, nama: "Petugas Ruvana", role: "petugas" as const };

function makeFacility(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: "Ruang kelas standar ber-AC",
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedById: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function mockTx(
  facility: Record<string, unknown> | null,
  actor: { id: number; nama: string; role: string } | null = petugas,
) {
  const $queryRaw = vi.fn().mockResolvedValue([]);
  const findUnique = vi.fn().mockResolvedValue(facility);
  const update = vi
    .fn()
    .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...(facility as object), ...data, statusChangedBy: actor }),
    );
  const tx = { facility: { findUnique, update }, $queryRaw };
  mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
  return { findUnique, update, $queryRaw, tx };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleFacilityStatusChanged.mockResolvedValue({ count: 0 });
});

describe("updateFacilityOperationalStatusService", () => {
  it("menyimpan status + provenance dan memanggil listener dalam transaksi yang sama", async () => {
    const { update, $queryRaw, tx } = mockTx(makeFacility());
    const persist = vi.fn().mockResolvedValue(undefined);

    const result = await updateFacilityOperationalStatusService(7, 1, "UNDER_MAINTENANCE", now, persist);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("UNDER_MAINTENANCE");
    expect(result.data.statusChangedAt).toBe(now.toISOString());
    expect(result.data.statusChangedBy).toEqual(petugas);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: "UNDER_MAINTENANCE", statusChangedAt: now, statusChangedById: 7 }),
      }),
    );
    // Row lock diambil sebelum update status.
    expect($queryRaw.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
    // Listener menerima client transaksi dan payload dengan instant yang sama.
    expect(mockHandleFacilityStatusChanged).toHaveBeenCalledWith(tx, {
      facilityId: 1,
      statusBaru: "UNDER_MAINTENANCE",
      waktu: now,
      diubahOleh: 7,
    });
    // Listener selesai sebelum hasil transaksi dipersist (belum commit).
    expect(mockHandleFacilityStatusChanged.mock.invocationCallOrder[0]).toBeLessThan(
      persist.mock.invocationCallOrder[0],
    );
    expect(persist).toHaveBeenCalledWith(tx, result.data);
  });

  it("meneruskan payload ACTIVE tanpa efek pembatalan", async () => {
    const { update } = mockTx(makeFacility({ status: "UNDER_MAINTENANCE" }));

    const result = await updateFacilityOperationalStatusService(7, 1, "ACTIVE", now);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("ACTIVE");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) }),
    );
    expect(mockHandleFacilityStatusChanged).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusBaru: "ACTIVE" }),
    );
  });

  it("menolak INACTIVE sebagai status asal tanpa menyentuh listener", async () => {
    const { update } = mockTx(makeFacility({ status: "INACTIVE" }));

    const result = await updateFacilityOperationalStatusService(7, 1, "ACTIVE", now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(update).not.toHaveBeenCalled();
    expect(mockHandleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("menolak INACTIVE sebagai tujuan (pertahanan runtime)", async () => {
    const { update } = mockTx(makeFacility());

    const result = await updateFacilityOperationalStatusService(7, 1, "INACTIVE" as never, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(update).not.toHaveBeenCalled();
    expect(mockHandleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("menolak target yang sama dengan status saat ini", async () => {
    const { update } = mockTx(makeFacility({ status: "ACTIVE" }));

    const result = await updateFacilityOperationalStatusService(7, 1, "ACTIVE", now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(update).not.toHaveBeenCalled();
  });

  it("memasking fasilitas yang tidak ditemukan sebagai not_found", async () => {
    const { update } = mockTx(null);

    const result = await updateFacilityOperationalStatusService(7, 999, "UNDER_MAINTENANCE", now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
    expect(update).not.toHaveBeenCalled();
    expect(mockHandleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("melempar kegagalan listener agar transaksi ikut gagal", async () => {
    mockTx(makeFacility());
    mockHandleFacilityStatusChanged.mockRejectedValue(new Error("listener gagal"));
    const persist = vi.fn().mockResolvedValue(undefined);

    await expect(updateFacilityOperationalStatusService(7, 1, "UNDER_MAINTENANCE", now, persist)).rejects.toThrow(
      "listener gagal",
    );
    expect(persist).not.toHaveBeenCalled();
  });
});
