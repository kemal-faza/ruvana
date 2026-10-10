import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  archiveAdminFacility,
  buildAdminFacilityWhere,
  countAdminFacilities,
  countFacilityHistory,
  createAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
  findAdminFacilityLocations,
  findArchivedFacilities,
  restoreAdminFacility,
} from "./admin-facilities";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildAdminFacilityWhere", () => {
  it("tanpa filter status tetap mengecualikan fasilitas terarsip", () => {
    expect(buildAdminFacilityWhere()).toEqual({ deletedAt: null });
  });

  it("menggabungkan filter dengan AND dan tanpa batas status publik", () => {
    expect(
      buildAdminFacilityWhere({ search: "lab", type: "laboratorium", location: "Gedung A", status: "INACTIVE" }),
    ).toEqual({
      deletedAt: null,
      status: "INACTIVE",
      nama: { contains: "lab", mode: "insensitive" },
      tipe: "laboratorium",
      lokasi: { contains: "Gedung A", mode: "insensitive" },
    });
  });
});

describe("query admin", () => {
  it("findAdminFacilities memakai where, order id asc, dan paginasi", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([] as never);
    await findAdminFacilities({ skip: 20, take: 20, status: "ACTIVE" });

    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, status: "ACTIVE" },
        orderBy: { id: "asc" },
        skip: 20,
        take: 20,
      }),
    );
  });

  it("countAdminFacilities memakai builder yang sama", async () => {
    vi.mocked(prisma.facility.count).mockResolvedValue(3 as never);
    await countAdminFacilities({ search: "lab" });

    expect(prisma.facility.count).toHaveBeenCalledWith({
      where: { deletedAt: null, nama: { contains: "lab", mode: "insensitive" } },
    });
  });

  it("findAdminFacilityById menyertakan provenance", async () => {
    vi.mocked(prisma.facility.findFirst).mockResolvedValue(null as never);
    await findAdminFacilityById(1);

    expect(prisma.facility.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1, deletedAt: null } }));
  });

  it("createAdminFacility memakai client transaksi dan meneruskan data", async () => {
    const create = vi.fn().mockResolvedValue({});
    const tx = { facility: { create } } as never;
    await createAdminFacility(tx, { nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 1 });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 1 } }),
    );
  });

  it("findAdminFacilityLocations mengambil lokasi unik terurut", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([] as never);
    await findAdminFacilityLocations();

    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { lokasi: true }, distinct: ["lokasi"], orderBy: { lokasi: "asc" } }),
    );
  });
});

describe("riwayat dan hapus fasilitas", () => {
  it("countFacilityHistory menjumlahkan reservasi dan laporan", async () => {
    const tx = {
      reservation: { count: vi.fn().mockResolvedValue(2) },
      report: { count: vi.fn().mockResolvedValue(1) },
    };

    await expect(countFacilityHistory(tx as never, 7)).resolves.toBe(3);
    expect(tx.reservation.count).toHaveBeenCalledWith({ where: { facilityId: 7 } });
    expect(tx.report.count).toHaveBeenCalledWith({ where: { facilityId: 7 } });
  });

  it("archiveAdminFacility menulis deletedAt dan aktor", async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 });
    const tx = { facility: { update } };
    const at = new Date("2026-10-10T00:00:00Z");

    await archiveAdminFacility(tx as never, 7, { deletedAt: at, deletedById: 1, deletedByNama: "Admin" });

    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { deletedAt: at, deletedById: 1, deletedByNama: "Admin" },
      select: { id: true },
    });
  });

  it("restoreAdminFacility mengosongkan kolom arsip", async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 });
    const tx = { facility: { update } };

    await restoreAdminFacility(tx as never, 7);

    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { deletedAt: null, deletedById: null, deletedByNama: null },
      select: { id: true },
    });
  });

  it("findArchivedFacilities mengambil yang terarsip, terbaru dulu", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([] as never);

    await findArchivedFacilities(10);

    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 10 }),
    );
  });
});
