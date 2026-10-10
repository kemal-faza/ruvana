import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FASILITAS_UPLOAD } from "@/config/business";
import { findPublicFacilityById } from "@/lib/db/facilities";
import { createFacilityPhotoReadUrl } from "@/lib/storage/facility-photo";

vi.mock("@/lib/db/facilities", () => ({ findPublicFacilityById: vi.fn() }));
vi.mock("@/lib/storage/facility-photo", () => ({ createFacilityPhotoReadUrl: vi.fn() }));

import { GET } from "./route";

function context(facilityId: string) {
  return { params: Promise.resolve({ facilityId }) };
}

function request() {
  return new NextRequest("http://localhost/api/facilities/1/photo");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/facilities/[facilityId]/photo", () => {
  it("mengalihkan 307 ke signed URL ketika fasilitas punya foto", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue({ foto: "facilities/7/abc.jpg" } as never);
    vi.mocked(createFacilityPhotoReadUrl).mockResolvedValue("https://blob.test/signed");

    const response = await GET(request(), context("1"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://blob.test/signed");
    expect(createFacilityPhotoReadUrl).toHaveBeenCalledWith("facilities/7/abc.jpg");
  });

  it("mengizinkan cache browser sesaat tanpa melewati masa berlaku signed URL", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue({ foto: "facilities/7/abc.jpg" } as never);
    vi.mocked(createFacilityPhotoReadUrl).mockResolvedValue("https://blob.test/signed");

    const response = await GET(request(), context("1"));

    const cacheControl = response.headers.get("cache-control") ?? "";
    const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 0);
    expect(cacheControl).toContain("private");
    expect(maxAge).toBe(FASILITAS_UPLOAD.masaCacheRedirectFotoDetik);
    expect(maxAge * 1000).toBeLessThan(FASILITAS_UPLOAD.masaBerlakuUrlBacaMs);
  });

  it("404 ketika fasilitas tidak ada", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(null);

    const response = await GET(request(), context("1"));

    expect(response.status).toBe(404);
    expect(createFacilityPhotoReadUrl).not.toHaveBeenCalled();
  });

  it("404 ketika fasilitas tidak punya foto", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue({ foto: null } as never);

    const response = await GET(request(), context("1"));

    expect(response.status).toBe(404);
    expect(createFacilityPhotoReadUrl).not.toHaveBeenCalled();
  });

  it("404 untuk identifier tidak valid", async () => {
    const response = await GET(request(), context("abc"));

    expect(response.status).toBe(404);
    expect(findPublicFacilityById).not.toHaveBeenCalled();
  });
});
