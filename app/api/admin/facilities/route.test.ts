import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimOrGetIdempotencyKey,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { revalidateFacilityViews } from "@/lib/facilities/revalidate";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import { currentAccount } from "@/lib/services/auth-service";
import { createFacility, listAdminFacilities } from "@/lib/services/admin-facility-service";

import { GET, POST } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ currentAccount: vi.fn() }));
vi.mock("@/lib/services/admin-facility-service", () => ({
  listAdminFacilities: vi.fn(),
  createFacility: vi.fn(),
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
  status: "ACTIVE",
  statusChangedAt: null,
  statusChangedBy: null,
};

function postRequest(body: unknown, overrides: { key?: string | null; origin?: string | null } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/admin/facilities", { method: "POST", headers, body: JSON.stringify(body) });
}

const createBody = { nama: "RK-101", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1", kapasitas: 40 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentAccount).mockResolvedValue(admin as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: {} } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
});

describe("GET /api/admin/facilities", () => {
  it("401 tanpa sesi", async () => {
    vi.mocked(currentAccount).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities"));
    expect(response.status).toBe(401);
  });

  it("403 untuk non-admin", async () => {
    vi.mocked(currentAccount).mockResolvedValue({ ...admin, role: "petugas" } as never);
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities"));
    expect(response.status).toBe(403);
  });

  it("200 dengan daftar dan no-store", async () => {
    vi.mocked(listAdminFacilities).mockResolvedValue({
      items: [facility],
      meta: { page: 1, perPage: 20, totalItems: 1, totalPages: 1 },
    } as never);

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities?status=INACTIVE"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(listAdminFacilities).toHaveBeenCalledWith({ page: 1, perPage: 20, status: "INACTIVE" });
  });

  it("422 untuk parameter tidak dikenal", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/admin/facilities?foo=1"));
    expect(response.status).toBe(422);
    expect(listAdminFacilities).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/facilities", () => {
  it("403 tanpa Origin", async () => {
    const response = await POST(postRequest(createBody, { origin: null }));
    expect(response.status).toBe(403);
    expect(createFacility).not.toHaveBeenCalled();
  });

  it("400 bila Idempotency-Key bukan UUID", async () => {
    const response = await POST(postRequest(createBody, { key: "bukan-uuid" }));
    expect(response.status).toBe(400);
  });

  it("422 untuk body tidak valid dan menyimpan replay", async () => {
    const response = await POST(postRequest({ nama: "Aula" }));
    expect(response.status).toBe(422);
    expect(createFacility).not.toHaveBeenCalled();
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 422 }),
    );
  });

  it("201 membuat fasilitas dan merevalidasi", async () => {
    vi.mocked(createFacility).mockResolvedValue({ ok: true, data: facility } as never);

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(facility);
    expect(revalidateFacilityViews).toHaveBeenCalledWith(1);
  });

  it("409 saat nama sudah dipakai", async () => {
    vi.mocked(createFacility).mockResolvedValue({
      ok: false,
      error: { type: "duplicate_name", message: "Nama fasilitas sudah digunakan" },
    } as never);

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("FACILITY_NAME_ALREADY_USED");
    expect(revalidateFacilityViews).not.toHaveBeenCalled();
  });

  it("me-replay hasil tersimpan untuk key dan payload sama", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: { requestHash: hashCanonicalBody(createBody), responseStatus: 201, responseBody: facility },
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(true);

    const response = await POST(postRequest(createBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(facility);
    expect(createFacility).not.toHaveBeenCalled();
    expect(waitForIdempotencyResult).not.toHaveBeenCalled();
  });
});
