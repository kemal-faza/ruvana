import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimOrGetIdempotencyKey,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import { currentAccount } from "@/lib/services/auth-service";
import { archiveFacility, getAdminFacility, updateFacility } from "@/lib/services/admin-facility-service";

import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ currentAccount: vi.fn() }));
vi.mock("@/lib/services/admin-facility-service", () => ({
  getAdminFacility: vi.fn(),
  updateFacility: vi.fn(),
  archiveFacility: vi.fn(),
}));
vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}));
vi.mock("@/lib/facilities/revalidate", () => ({ revalidateFacilityViews: vi.fn() }));

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";
const admin = { id: 1, nama: "Admin Ruvana", email: "admin@ruvana.test", role: "admin" };

const facility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas",
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: null,
  status: "UNDER_MAINTENANCE",
  statusChangedAt: "2026-09-30T05:00:00.000Z",
  statusChangedBy: { id: 1, nama: "Admin Ruvana", role: "admin" },
};

function makeContext(facilityId = "1") {
  return { params: Promise.resolve({ facilityId }) };
}

function patchRequest(body: unknown, overrides: { origin?: string | null; key?: string | null } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/admin/facilities/1", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentAccount).mockResolvedValue(admin as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: {} } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
});

describe("GET /api/admin/facilities/[facilityId]", () => {
  it("200 detail dengan provenance", async () => {
    vi.mocked(getAdminFacility).mockResolvedValue(facility as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities/1"), makeContext());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(facility);
  });

  it("404 bila tidak ada", async () => {
    vi.mocked(getAdminFacility).mockResolvedValue(null as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities/1"), makeContext());
    expect(response.status).toBe(404);
  });

  it("500 problem+json ketika service gagal", async () => {
    vi.mocked(getAdminFacility).mockRejectedValue(new Error("db down"));
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities/1"), makeContext());
    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe("INTERNAL_ERROR");
  });
});

describe("PATCH /api/admin/facilities/[facilityId]", () => {
  it("403 tanpa Origin", async () => {
    const response = await PATCH(patchRequest({ status: "ACTIVE" }, { origin: null }), makeContext());
    expect(response.status).toBe(403);
    expect(updateFacility).not.toHaveBeenCalled();
  });

  it("422 body kosong", async () => {
    const response = await PATCH(patchRequest({}), makeContext());
    expect(response.status).toBe(422);
    expect(updateFacility).not.toHaveBeenCalled();
  });

  it("200 memperbarui dan merevalidasi", async () => {
    vi.mocked(updateFacility).mockResolvedValue({ ok: true, data: facility } as never);

    const response = await PATCH(patchRequest({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(facility);
    expect(revalidateFacilityViews).toHaveBeenCalledWith(1);
  });

  it("404 saat fasilitas tidak ada", async () => {
    vi.mocked(updateFacility).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Fasilitas tidak ditemukan" },
    } as never);

    const response = await PATCH(patchRequest({ kapasitas: 10 }), makeContext());

    expect(response.status).toBe(404);
    expect(revalidateFacilityViews).not.toHaveBeenCalled();
  });

  it("409 saat transisi tidak valid", async () => {
    vi.mocked(updateFacility).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Transisi status fasilitas tidak diizinkan dari status saat ini." },
    } as never);

    const response = await PATCH(patchRequest({ status: "ACTIVE" }), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("INVALID_FACILITY_TRANSITION");
    expect(revalidateFacilityViews).not.toHaveBeenCalled();
  });

  it("me-replay hasil tersimpan", async () => {
    const body = { status: "UNDER_MAINTENANCE" };
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: { requestHash: hashCanonicalBody(body), responseStatus: 200, responseBody: facility },
    } as never);
    const { isIdempotencySettled } = await import("@/lib/db/idempotency");
    vi.mocked(isIdempotencySettled).mockReturnValue(true);
    vi.mocked(waitForIdempotencyResult).mockResolvedValue(null as never);

    const response = await PATCH(patchRequest(body), makeContext());

    expect(response.status).toBe(200);
    expect(updateFacility).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/facilities/[facilityId]", () => {
  function deleteRequest(overrides: { origin?: string | null } = {}) {
    const headers = new Headers();
    const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
    if (origin !== null) headers.set("Origin", origin);
    return new NextRequest("http://localhost:3000/api/admin/facilities/1", { method: "DELETE", headers });
  }

  it("403 tanpa Origin", async () => {
    const response = await DELETE(deleteRequest({ origin: null }), makeContext());

    expect(response.status).toBe(403);
    expect(archiveFacility).not.toHaveBeenCalled();
  });

  it("204 mengarsipkan dan merevalidasi", async () => {
    vi.mocked(archiveFacility).mockResolvedValue({ ok: true } as never);

    const response = await DELETE(deleteRequest(), makeContext());

    expect(response.status).toBe(204);
    expect(archiveFacility).toHaveBeenCalledWith({ id: 1, nama: "Admin Ruvana" }, 1);
    expect(revalidateFacilityViews).toHaveBeenCalledWith(1);
  });

  it("404 bila tidak ada", async () => {
    vi.mocked(archiveFacility).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Fasilitas tidak ditemukan" },
    } as never);

    const response = await DELETE(deleteRequest(), makeContext());

    expect(response.status).toBe(404);
  });

  it("409 bila fasilitas punya riwayat", async () => {
    vi.mocked(archiveFacility).mockResolvedValue({
      ok: false,
      error: { type: "has_history", message: "punya riwayat" },
    } as never);

    const response = await DELETE(deleteRequest(), makeContext());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("FACILITY_HAS_HISTORY");
    expect(revalidateFacilityViews).not.toHaveBeenCalled();
  });
});
