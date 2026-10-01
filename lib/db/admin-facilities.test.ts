import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  buildAdminFacilityWhere,
  countAdminFacilities,
  createAdminFacility,
  findAdminFacilities,
  findAdminFacilityById,
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

  it("createAdminFacility meneruskan data", async () => {
    vi.mocked(prisma.facility.create).mockResolvedValue({} as never);
    await createAdminFacility({ nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 1 });

    expect(prisma.facility.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 1 } }),
    );
  });
});
