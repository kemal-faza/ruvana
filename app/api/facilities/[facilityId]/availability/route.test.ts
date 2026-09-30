import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacilityAvailability } from "@/lib/services/availability-service";

import { GET } from "./route";

vi.mock("@/lib/services/availability-service", () => ({
  getFacilityAvailability: vi.fn(),
}));

const mockAvailability = {
  facilityId: 1,
  date: "2026-09-15",
  timezone: "Asia/Jakarta",
  slots: Array.from({ length: 26 }, (_, index) => ({
    startTime: `${String(7 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
    endTime: `${String(7 + Math.floor((index + 1) / 2)).padStart(2, "0")}:${(index + 1) % 2 === 0 ? "00" : "30"}`,
    available: true,
    blockedBy: null,
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeContext(facilityId: string) {
  return { params: Promise.resolve({ facilityId }) };
}

describe("GET /api/facilities/[facilityId]/availability", () => {
  it("mengembalikan 200 dengan 26 slot dan no-store", async () => {
    vi.mocked(getFacilityAvailability).mockResolvedValue(mockAvailability);

    const request = new NextRequest("http://localhost/api/facilities/1/availability?date=2026-09-15");
    const response = await GET(request, makeContext("1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.slots).toHaveLength(26);
    expect(getFacilityAvailability).toHaveBeenCalledWith(1, "2026-09-15");
  });

  it("mengembalikan 404 ketika fasilitas tidak ditemukan atau INACTIVE", async () => {
    vi.mocked(getFacilityAvailability).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/facilities/999/availability?date=2026-09-15");
    const response = await GET(request, makeContext("999"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("mengembalikan 422 ketika facilityId bukan angka", async () => {
    const request = new NextRequest("http://localhost/api/facilities/abc/availability?date=2026-09-15");
    const response = await GET(request, makeContext("abc"));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(getFacilityAvailability).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 ketika date tidak dikirim", async () => {
    const request = new NextRequest("http://localhost/api/facilities/1/availability");
    const response = await GET(request, makeContext("1"));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors[0]).toMatchObject({ field: "date", code: "REQUIRED" });
    expect(getFacilityAvailability).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 ketika date formatnya salah", async () => {
    const request = new NextRequest("http://localhost/api/facilities/1/availability?date=15-09-2026");
    const response = await GET(request, makeContext("1"));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors[0]).toMatchObject({ field: "date", code: "INVALID_DATE" });
  });

  it("mengembalikan 500 ketika service melempar error", async () => {
    vi.mocked(getFacilityAvailability).mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost/api/facilities/1/availability?date=2026-09-15");
    const response = await GET(request, makeContext("1"));

    expect(response.status).toBe(500);
  });
});
