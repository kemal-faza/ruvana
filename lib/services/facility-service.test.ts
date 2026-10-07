import { beforeEach, describe, expect, it, vi } from "vitest";

import { countPublicFacilities, findPublicFacilities, findPublicFacilityById } from "@/lib/db/facilities";

import { getPublicFacility, listPublicFacilities } from "./facility-service";

vi.mock("@/lib/db/facilities", () => ({
  findPublicFacilities: vi.fn(),
  countPublicFacilities: vi.fn(),
  findPublicFacilityById: vi.fn(),
}));

const mockFacility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas" as const,
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: "Ruang kelas standar",
  status: "ACTIVE" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listPublicFacilities", () => {
  it("mengembalikan items dan meta yang benar", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([mockFacility]);
    vi.mocked(countPublicFacilities).mockResolvedValue(21);

    const result = await listPublicFacilities({ page: 2, perPage: 20 });

    expect(findPublicFacilities).toHaveBeenCalledWith({ skip: 20, take: 20 });
    expect(result).toEqual({
      items: [mockFacility],
      meta: { page: 2, perPage: 20, totalItems: 21, totalPages: 2 },
    });
  });

  it("hanya mengandung tujuh field publik, tanpa data reservasi", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([mockFacility]);
    vi.mocked(countPublicFacilities).mockResolvedValue(1);

    const result = await listPublicFacilities({ page: 1, perPage: 20 });

    expect(Object.keys(result.items[0]).sort()).toEqual(
      ["deskripsi", "id", "kapasitas", "lokasi", "nama", "status", "tipe"].sort(),
    );
  });

  it("tidak mengirim filter kosong ke db ketika tidak ada filter aktif", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([]);
    vi.mocked(countPublicFacilities).mockResolvedValue(0);

    await listPublicFacilities({ page: 1, perPage: 20 });

    expect(findPublicFacilities).toHaveBeenCalledWith({ skip: 0, take: 20 });
    expect(countPublicFacilities).toHaveBeenCalledWith({});
  });

  it("meneruskan filter aktif ke list dan count", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([]);
    vi.mocked(countPublicFacilities).mockResolvedValue(0);

    await listPublicFacilities({
      page: 1,
      perPage: 20,
      search: "lab",
      type: "laboratorium",
      location: "Gedung A",
      minCapacity: 30,
    });

    const filters = { search: "lab", type: "laboratorium", location: "Gedung A", minCapacity: 30 };
    expect(findPublicFacilities).toHaveBeenCalledWith({ skip: 0, take: 20, ...filters });
    expect(countPublicFacilities).toHaveBeenCalledWith(filters);
  });

  it("menghitung totalPages dari count terfilter", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([mockFacility]);
    vi.mocked(countPublicFacilities).mockResolvedValue(5);

    const result = await listPublicFacilities({ page: 1, perPage: 2, search: "lab" });

    expect(countPublicFacilities).toHaveBeenCalledWith({ search: "lab" });
    expect(result.meta).toEqual({ page: 1, perPage: 2, totalItems: 5, totalPages: 3 });
  });
});

describe("getPublicFacility", () => {
  it("mengembalikan fasilitas ketika ditemukan", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(mockFacility);

    const result = await getPublicFacility(1);

    expect(findPublicFacilityById).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockFacility);
  });

  it("mengembalikan null ketika tidak ditemukan atau INACTIVE", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(null);

    const result = await getPublicFacility(999);

    expect(result).toBeNull();
  });
});
