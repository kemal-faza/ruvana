import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicFacility } from "@/lib/services/facility-service";

import { GET } from "./route";

vi.mock("@/lib/services/facility-service", () => ({
  getPublicFacility: vi.fn(),
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

function makeContext(facilityId: string) {
  return { params: Promise.resolve({ facilityId }) };
}

describe("GET /api/facilities/[facilityId]", () => {
  it("mengembalikan 200 ketika fasilitas ditemukan", async () => {
    vi.mocked(getPublicFacility).mockResolvedValue(mockFacility);

    const request = new NextRequest("http://localhost/api/facilities/1");
    const response = await GET(request, makeContext("1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual(mockFacility);
  });

  it("mengembalikan 404 ketika fasilitas tidak ditemukan atau INACTIVE", async () => {
    vi.mocked(getPublicFacility).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/facilities/999");
    const response = await GET(request, makeContext("999"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("mengembalikan 422 ketika facilityId bukan angka", async () => {
    const request = new NextRequest("http://localhost/api/facilities/abc");
    const response = await GET(request, makeContext("abc"));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(getPublicFacility).not.toHaveBeenCalled();
  });
});
