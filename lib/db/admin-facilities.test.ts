import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  buildAdminFacilityWhere,
  countAdminFacilities,
  countFacilityHistory,
  createAdminFacility,
  deleteAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
  findAdminFacilityLocations,
} from "./admin-facilities";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: {
      findMany: vi.fn(),
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
  it("tanpa filter status mengembalikan daftar semua status", () => {
    expect(buildAdminFacilityWhere()).toEqual({});
  });

  it("menggabungkan filter dengan AND dan tanpa batas status publik", () => {
    expect(
      buildAdminFacilityWhere({ search: "lab", type: "laboratorium", location: "Gedung A", status: "INACTIVE" }),
    ).toEqual({
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
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
        skip: 20,
        take: 20,
      }),
    );
  });

  it("countAdminFacilities memakai builder yang sama", async () => {
    vi.mocked(prisma.facility.count).mockResolvedValue(3 as never);
    await countAdminFacilities({ search: "lab" });

    expect(prisma.facility.count).toHaveBeenCalledWith({ where: { nama: { contains: "lab", mode: "insensitive" } } });
  });

  it("findAdminFacilityById menyertakan provenance", async () => {
    vi.mocked(prisma.facility.findUnique).mockResolvedValue(null as never);
    await findAdminFacilityById(1);

    expect(prisma.facility.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
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

  it("deleteAdminFacility menghapus baris dan mengambil pathname foto", async () => {
    const del = vi.fn().mockResolvedValue({ id: 7, foto: "facilities/1/x.jpg" });
    const tx = { facility: { delete: del } };

    await deleteAdminFacility(tx as never, 7);

    expect(del).toHaveBeenCalledWith({ where: { id: 7 }, select: { id: true, foto: true } });
  });
});
