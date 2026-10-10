import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { findFacilityByFoto } from "@/lib/db/admin-facilities";
import { originError } from "@/lib/http/origin";
import {
  createFacilityPhotoUpload,
  isFacilityPhotoContentType,
  isOwnedFacilityPhotoPathname,
  removeFacilityPhoto,
} from "@/lib/storage/facility-photo";

import { guardAdmin } from "../guard";

vi.mock("../guard", () => ({ guardAdmin: vi.fn() }));
vi.mock("@/lib/http/origin", () => ({ originError: vi.fn(() => null) }));
vi.mock("@/lib/db/admin-facilities", () => ({ findFacilityByFoto: vi.fn() }));
vi.mock("@/lib/storage/facility-photo", () => ({
  createFacilityPhotoUpload: vi.fn(),
  isFacilityPhotoContentType: vi.fn(),
  isOwnedFacilityPhotoPathname: vi.fn(),
  removeFacilityPhoto: vi.fn(),
}));

import { DELETE, POST } from "./route";

const admin = { id: 7, nama: "Admin Ruvana", role: "admin" as const };

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/facilities/photo-uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/facilities/photo-uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(originError).mockReturnValue(null);
  vi.mocked(guardAdmin).mockResolvedValue(admin);
  vi.mocked(isFacilityPhotoContentType).mockReturnValue(true);
});

describe("POST /api/admin/facilities/photo-uploads", () => {
  it("menerbitkan URL unggah untuk admin", async () => {
    vi.mocked(createFacilityPhotoUpload).mockResolvedValue({
      pathname: "facilities/7/abc.jpg",
      uploadUrl: "https://blob.test/upload",
      validUntil: 123,
    });

    const response = await POST(postRequest({ contentType: "image/jpeg", size: 1024 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pathname: "facilities/7/abc.jpg", uploadUrl: "https://blob.test/upload", validUntil: 123 });
    expect(createFacilityPhotoUpload).toHaveBeenCalledWith(7, "image/jpeg", 1024);
  });

  it("422 untuk tipe konten tak didukung", async () => {
    vi.mocked(isFacilityPhotoContentType).mockReturnValue(false);

    const response = await POST(postRequest({ contentType: "image/gif", size: 1024 }));

    expect(response.status).toBe(422);
    expect(createFacilityPhotoUpload).not.toHaveBeenCalled();
  });

  it("422 untuk ukuran di luar batas", async () => {
    const response = await POST(postRequest({ contentType: "image/png", size: 0 }));

    expect(response.status).toBe(422);
    expect(createFacilityPhotoUpload).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/facilities/photo-uploads", () => {
  it("membersihkan unggahan yang belum terpasang", async () => {
    vi.mocked(isOwnedFacilityPhotoPathname).mockReturnValue(true);
    vi.mocked(findFacilityByFoto).mockResolvedValue(null);

    const response = await DELETE(deleteRequest({ pathname: "facilities/7/abc.jpg" }));

    expect(response.status).toBe(204);
    expect(removeFacilityPhoto).toHaveBeenCalledWith("facilities/7/abc.jpg", 7);
  });

  it("tidak menghapus blob yang sudah terpasang ke fasilitas", async () => {
    vi.mocked(isOwnedFacilityPhotoPathname).mockReturnValue(true);
    vi.mocked(findFacilityByFoto).mockResolvedValue({ id: 1 } as never);

    const response = await DELETE(deleteRequest({ pathname: "facilities/7/abc.jpg" }));

    expect(response.status).toBe(204);
    expect(removeFacilityPhoto).not.toHaveBeenCalled();
  });

  it("400 untuk pathname yang bukan milik pengunggah", async () => {
    vi.mocked(isOwnedFacilityPhotoPathname).mockReturnValue(false);

    const response = await DELETE(deleteRequest({ pathname: "facilities/9/abc.jpg" }));

    expect(response.status).toBe(400);
    expect(removeFacilityPhoto).not.toHaveBeenCalled();
  });
});
