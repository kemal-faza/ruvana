import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import { updateFacilityOperationalStatusService } from "@/lib/services/facility-status-service";

import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}));
vi.mock("@/lib/services/facility-status-service", () => ({
  updateFacilityOperationalStatusService: vi.fn(),
}));

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";
const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const facilityResult = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas",
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: "Ruang kelas standar ber-AC",
  status: "UNDER_MAINTENANCE",
  statusChangedAt: "2026-09-30T05:00:00.000Z",
  statusChangedBy: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
};

function request(
  body: unknown,
  overrides: { key?: string | null; origin?: string | null } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/staff/facilities/1/status", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function makeContext(facilityId = "1") {
  return { params: Promise.resolve({ facilityId }) };
}

function claimRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    key: KEY,
    principalId: 7,
    scope: "PATCH:/api/staff/facilities/1/status",
    requestHash: "hash",
    responseStatus: null,
    responseBody: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: claimRecord() } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
});

describe("PATCH /api/staff/facilities/[facilityId]/status", () => {
  it("mengubah status dan menyimpan hasil idempotency dalam transaksi service", async () => {
    vi.mocked(updateFacilityOperationalStatusService).mockImplementation((async (
      _actorId: number,
      _facilityId: number,
      _status: string,
      _now: Date,
      persist?: (tx: unknown, result: unknown) => Promise<void>,
    ) => {
      await persist?.({}, facilityResult);
      return { ok: true, data: facilityResult };
    }) as never);

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(facilityResult);
    expect(updateFacilityOperationalStatusService).toHaveBeenCalledWith(
      7,
      1,
      "UNDER_MAINTENANCE",
      expect.any(Date),
      expect.any(Function),
    );
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7 }),
      { responseStatus: 200, responseBody: facilityResult },
      expect.anything(),
    );
  });

  it("mengembalikan 401 tanpa sesi dan tidak menyentuh idempotency", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(401);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(403);
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 ketika Origin hilang", async () => {
    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }, { origin: null }), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 ketika Idempotency-Key bukan UUID", async () => {
    const response = await PATCH(
      request({ status: "UNDER_MAINTENANCE" }, { key: "bukan-uuid" }),
      makeContext(),
    );

    expect(response.status).toBe(400);
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 untuk body INACTIVE tanpa memanggil service", async () => {
    const response = await PATCH(request({ status: "INACTIVE" }), makeContext());

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors).toEqual([expect.objectContaining({ field: "status", code: "INVALID_ENUM" })]);
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 422 }),
    );
  });

  it("mengembalikan 422 ketika facilityId bukan angka", async () => {
    const response = await PATCH(request({ status: "ACTIVE" }), makeContext("abc"));

    expect(response.status).toBe(422);
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 dari service dan menyimpan replay", async () => {
    vi.mocked(updateFacilityOperationalStatusService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Fasilitas tidak ditemukan" },
    } as never);

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(404);
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseStatus: 404 }),
    );
  });

  it("mengembalikan 409 INVALID_FACILITY_TRANSITION dari service", async () => {
    vi.mocked(updateFacilityOperationalStatusService).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Transisi status fasilitas tidak diizinkan dari status saat ini." },
    } as never);

    const response = await PATCH(request({ status: "ACTIVE" }), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("INVALID_FACILITY_TRANSITION");
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseStatus: 409 }),
    );
  });

  it("me-replay hasil yang sudah tersimpan untuk key dan payload yang sama", async () => {
    const body = { status: "UNDER_MAINTENANCE" };
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({
        requestHash: hashCanonicalBody(body),
        responseStatus: 200,
        responseBody: facilityResult,
      }),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(true);

    const response = await PATCH(request(body), makeContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(facilityResult);
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
    expect(waitForIdempotencyResult).not.toHaveBeenCalled();
  });

  it("menolak payload berbeda untuk key yang sama dengan 409", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({ requestHash: "hash-beda", responseStatus: 200, responseBody: facilityResult }),
    } as never);

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(updateFacilityOperationalStatusService).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 dan menghapus klaim ketika service gagal tak terduga", async () => {
    vi.mocked(updateFacilityOperationalStatusService).mockRejectedValue(new Error("db down"));

    const response = await PATCH(request({ status: "UNDER_MAINTENANCE" }), makeContext());

    expect(response.status).toBe(500);
    expect(deleteIdempotencyClaim).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7 }),
    );
  });
});
