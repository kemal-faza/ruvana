import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import {
  countAdminFacilities,
  createAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
  updateAdminFacility,
} from "@/lib/db/admin-facilities";
import { lockFacilityById } from "@/lib/db/facilities";
import { handleFacilityStatusChanged } from "@/lib/reservations/maintenance-listener";

import {
  createFacility,
  getAdminFacility,
  listAdminFacilities,
  updateFacility,
} from "./admin-facility-service";

const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (...args: unknown[]) => mockTransaction(...args) },
}));
vi.mock("@/lib/db/facilities", () => ({ lockFacilityById: vi.fn() }));
vi.mock("@/lib/reservations/maintenance-listener", () => ({ handleFacilityStatusChanged: vi.fn() }));
vi.mock("@/lib/db/admin-facilities", () => ({
  findAdminFacilities: vi.fn(),
  countAdminFacilities: vi.fn(),
  findAdminFacilityById: vi.fn(),
  createAdminFacility: vi.fn(),
  updateAdminFacility: vi.fn(),
}));

const now = new Date("2026-09-30T05:00:00Z");
const actor = { id: 7, nama: "Admin Ruvana", role: "admin" as const };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: null,
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedBy: null,
    ...overrides,
  };
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "7.10.0" });
}

function mockTx(facility: Record<string, unknown> | null, updated: Record<string, unknown> = row()) {
  const tx = { facility: { update: vi.fn() } };
  vi.mocked(lockFacilityById).mockResolvedValue(facility as never);
  vi.mocked(updateAdminFacility).mockResolvedValue(updated as never);
  mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(handleFacilityStatusChanged).mockResolvedValue({ count: 0 });
});

describe("listAdminFacilities", () => {
  it("mengembalikan items dan meta terfilter", async () => {
    vi.mocked(findAdminFacilities).mockResolvedValue([row()] as never);
    vi.mocked(countAdminFacilities).mockResolvedValue(21 as never);

    const result = await listAdminFacilities({ page: 2, perPage: 20, status: "INACTIVE" });

    expect(findAdminFacilities).toHaveBeenCalledWith({ skip: 20, take: 20, status: "INACTIVE" });
    expect(countAdminFacilities).toHaveBeenCalledWith({ status: "INACTIVE" });
    expect(result.meta).toEqual({ page: 2, perPage: 20, totalItems: 21, totalPages: 2 });
    expect(result.items[0].statusChangedAt).toBeNull();
  });
});

describe("getAdminFacility", () => {
  it("memetakan provenance ke ISO", async () => {
    vi.mocked(findAdminFacilityById).mockResolvedValue(
      row({ statusChangedAt: now, statusChangedBy: actor }) as never,
    );

    const result = await getAdminFacility(1);

    expect(result?.statusChangedAt).toBe(now.toISOString());
    expect(result?.statusChangedBy).toEqual(actor);
  });

  it("mengembalikan null bila tidak ada", async () => {
    vi.mocked(findAdminFacilityById).mockResolvedValue(null as never);
    expect(await getAdminFacility(999)).toBeNull();
  });
});

describe("createFacility", () => {
  const input = { nama: "RK-101", tipe: "ruang_kelas" as const, lokasi: "Gedung A", kapasitas: 40 };

  function mockCreateTx() {
    const tx = { facility: { create: vi.fn() } };
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    return tx;
  }

  it("membuat di dalam transaksi dan memetakan hasil", async () => {
    const tx = mockCreateTx();
    vi.mocked(createAdminFacility).mockResolvedValue(row() as never);

    const result = await createFacility(input);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(1);
    expect(createAdminFacility).toHaveBeenCalledWith(tx, input);
  });

  it("memanggil persistSuccess dengan transaksi yang sama", async () => {
    const tx = mockCreateTx();
    vi.mocked(createAdminFacility).mockResolvedValue(row() as never);
    const persist = vi.fn().mockResolvedValue(undefined);

    await createFacility(input, persist);

    expect(persist).toHaveBeenCalledWith(tx, expect.objectContaining({ id: 1 }));
  });

  it("memetakan P2002 ke duplicate_name", async () => {
    mockTransaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn({}));
    vi.mocked(createAdminFacility).mockRejectedValue(p2002());

    const result = await createFacility(input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("duplicate_name");
  });
});

describe("updateFacility", () => {
  it("menolak fasilitas yang tidak ditemukan", async () => {
    mockTx(null);

    const result = await updateFacility(7, 999, { kapasitas: 10 }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("not_found");
    expect(lockFacilityById).toHaveBeenCalled();
  });

  it("menolak transisi yang tidak ada di matriks admin", async () => {
    mockTx(row({ status: "INACTIVE" }));

    const result = await updateFacility(7, 1, { status: "UNDER_MAINTENANCE" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("transition");
    expect(updateAdminFacility).not.toHaveBeenCalled();
    expect(handleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("update field saja tanpa status tidak menyentuh provenance atau kontrak", async () => {
    mockTx(row());

    const result = await updateFacility(7, 1, { nama: "RK-101 Baru" }, now);

    expect(result.ok).toBe(true);
    expect(updateAdminFacility).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({ nama: "RK-101 Baru" }),
    );
    const data = vi.mocked(updateAdminFacility).mock.calls[0][2];
    expect(data).not.toHaveProperty("statusChangedAt");
    expect(handleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("transisi ke UNDER_MAINTENANCE menyimpan provenance dan memanggil listener dengan instant yang sama", async () => {
    const updated = row({ status: "UNDER_MAINTENANCE", statusChangedAt: now, statusChangedBy: actor });
    const tx = mockTx(row({ status: "ACTIVE" }), updated);
    const persist = vi.fn().mockResolvedValue(undefined);

    const result = await updateFacility(7, 1, { status: "UNDER_MAINTENANCE" }, now, persist);

    expect(result.ok).toBe(true);
    expect(updateAdminFacility).toHaveBeenCalledWith(
      expect.anything(),
      1,
      expect.objectContaining({ status: "UNDER_MAINTENANCE", statusChangedAt: now, statusChangedById: 7 }),
    );
    expect(handleFacilityStatusChanged).toHaveBeenCalledWith(tx, {
      facilityId: 1,
      statusBaru: "UNDER_MAINTENANCE",
      waktu: now,
      diubahOleh: 7,
    });
    expect(persist).toHaveBeenCalled();
  });

  it("transisi ke INACTIVE tidak memanggil listener", async () => {
    mockTx(row({ status: "ACTIVE" }), row({ status: "INACTIVE", statusChangedAt: now, statusChangedBy: actor }));

    const result = await updateFacility(7, 1, { status: "INACTIVE" }, now);

    expect(result.ok).toBe(true);
    expect(handleFacilityStatusChanged).not.toHaveBeenCalled();
  });

  it("memetakan P2002 saat rename ke duplicate_name", async () => {
    mockTx(row());
    vi.mocked(updateAdminFacility).mockRejectedValue(p2002());

    const result = await updateFacility(7, 1, { nama: "Sudah ada" }, now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("duplicate_name");
  });
});
