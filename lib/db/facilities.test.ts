import { beforeEach, describe, expect, it, vi } from "vitest";

import { countPublicFacilities, findPublicFacilities } from "./facilities";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const PUBLIC_STATUSES = ["ACTIVE", "UNDER_MAINTENANCE"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildPublicFacilityWhere", () => {
  it("default hanya menyaring status publik", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    await findPublicFacilities({ skip: 0, take: 20 });
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: PUBLIC_STATUSES } } }),
    );
  });

  it("menambahkan filter search pada nama secara case-insensitive", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    await findPublicFacilities({ skip: 0, take: 20, search: "lab" });
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: PUBLIC_STATUSES },
          nama: { contains: "lab", mode: "insensitive" },
        },
      }),
    );
  });

  it("menambahkan filter type, location, dan minCapacity dengan logika AND", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    await findPublicFacilities({
      skip: 0,
      take: 20,
      type: "laboratorium",
      location: "Gedung A",
      minCapacity: 30,
    });
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: PUBLIC_STATUSES },
          tipe: "laboratorium",
          lokasi: { contains: "Gedung A", mode: "insensitive" },
          kapasitas: { gte: 30 },
        },
      }),
    );
  });

  it("menggabungkan semua filter sekaligus", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    await findPublicFacilities({
      skip: 0,
      take: 20,
      search: "lab",
      type: "laboratorium",
      location: "Gedung",
      minCapacity: 10,
    });
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: PUBLIC_STATUSES },
          nama: { contains: "lab", mode: "insensitive" },
          tipe: "laboratorium",
          lokasi: { contains: "Gedung", mode: "insensitive" },
          kapasitas: { gte: 10 },
        },
      }),
    );
  });

  it("memakai where yang sama untuk list dan count", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    vi.mocked(prisma.facility.count).mockResolvedValue(0);
    await findPublicFacilities({ skip: 0, take: 20, search: "lab" });
    await countPublicFacilities({ search: "lab" });
    const listWhere = vi.mocked(prisma.facility.findMany).mock.calls[0][0]?.where;
    const countWhere = vi.mocked(prisma.facility.count).mock.calls[0][0]?.where;
    expect(listWhere).toEqual(countWhere);
  });
});

describe("findPublicFacilities", () => {
  it("meneruskan skip, take, dan urutan id ASC", async () => {
    vi.mocked(prisma.facility.findMany).mockResolvedValue([]);
    await findPublicFacilities({ skip: 20, take: 20 });
    expect(prisma.facility.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20, orderBy: { id: "asc" } }),
    );
  });
});
