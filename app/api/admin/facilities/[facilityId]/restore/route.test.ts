import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { originError } from "@/lib/http/origin";
import { restoreFacility } from "@/lib/services/admin-facility-service";

import { guardAdmin } from "../../guard";

vi.mock("../../guard", () => ({ guardAdmin: vi.fn() }));
vi.mock("@/lib/http/origin", () => ({ originError: vi.fn(() => null) }));
vi.mock("@/lib/facilities/revalidate", () => ({ revalidateFacilityViews: vi.fn() }));
vi.mock("@/lib/services/admin-facility-service", () => ({ restoreFacility: vi.fn() }));

import { POST } from "./route";

function request(origin: string | null = "http://localhost:3000") {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  return new NextRequest("http://localhost:3000/api/admin/facilities/1/restore", { method: "POST", headers });
}

function context(facilityId = "1") {
  return { params: Promise.resolve({ facilityId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(originError).mockReturnValue(null);
  vi.mocked(guardAdmin).mockResolvedValue({ id: 1, nama: "Admin Ruvana", role: "admin" });
});

describe("POST /api/admin/facilities/[facilityId]/restore", () => {
  it("204 memulihkan dan merevalidasi", async () => {
    vi.mocked(restoreFacility).mockResolvedValue({ ok: true } as never);

    const response = await POST(request(), context());

    expect(response.status).toBe(204);
    expect(restoreFacility).toHaveBeenCalledWith(1);
    expect(revalidateFacilityViews).toHaveBeenCalledWith(1);
  });

  it("404 bila fasilitas terarsip tidak ada", async () => {
    vi.mocked(restoreFacility).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Fasilitas terarsip tidak ditemukan" },
    } as never);

    const response = await POST(request(), context());

    expect(response.status).toBe(404);
    expect(revalidateFacilityViews).not.toHaveBeenCalled();
  });

  it("403 saat Origin ditolak", async () => {
    vi.mocked(originError).mockReturnValue(new NextResponse(null, { status: 403 }) as never);

    const response = await POST(request(null), context());

    expect(response.status).toBe(403);
    expect(restoreFacility).not.toHaveBeenCalled();
  });
});
