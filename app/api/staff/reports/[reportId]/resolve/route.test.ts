import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import { resolveStaffReportService } from "@/lib/services/report-processing-service";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}));
vi.mock("@/lib/services/report-processing-service", () => ({
  resolveStaffReportService: vi.fn(),
}));

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";
const SCOPE = "POST:/api/staff/reports/15/resolve";
const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const laporan = {
  id: 15,
  facility: { id: 1, nama: "RK-101" },
  kategori: "Listrik",
  deskripsi: "Lampu sisi kanan tidak menyala.",
  foto: { hasPhoto: true, contentType: "image/png", size: 245_760 },
  status: "RESOLVED",
  catatanResolusi: "Lampu diganti dan diuji.",
  ditanganiOleh: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
  createdAt: "2026-09-09T03:35:00.000Z",
  processedAt: "2026-09-10T06:00:00.000Z",
};

const body = { catatanResolusi: "Lampu diganti dan diuji." };

function request(
  payload: unknown = body,
  overrides: { key?: string | null; origin?: string | null } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/staff/reports/15/resolve", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

function makeContext(reportId = "15") {
  return { params: Promise.resolve({ reportId }) };
}

function claimRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    key: KEY,
    principalId: 7,
    scope: SCOPE,
    requestHash: hashCanonicalBody(body),
    responseStatus: null,
    responseBody: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

/** Service tiruan yang menulis hasilnya lewat persist di dalam transaksi. */
function serviceSukses() {
  vi.mocked(resolveStaffReportService).mockImplementation((async (
    _staffId: number,
    _id: number,
    _catatan: string,
    _now: Date,
    persist?: (tx: unknown, result: unknown) => Promise<void>,
  ) => {
    await persist?.({}, laporan);
    return { ok: true, data: laporan };
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: claimRecord() } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
  serviceSukses();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reports/[reportId]/resolve", () => {
  it("menyelesaikan laporan dan menyimpan hasil idempotency di transaksi service", async () => {
    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(laporan);
    expect(resolveStaffReportService).toHaveBeenCalledWith(
      7,
      15,
      "Lampu diganti dan diuji.",
      expect.any(Date),
      expect.any(Function),
    );
    expect(claimOrGetIdempotencyKey).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7, scope: SCOPE, requestHash: hashCanonicalBody(body) }),
    );
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      { responseStatus: 200, responseBody: laporan },
      expect.anything(),
    );
  });

  it("mengembalikan 400 ketika Idempotency-Key bukan UUID", async () => {
    const response = await POST(request(body, { key: "bukan-uuid" }), makeContext());

    expect(response.status).toBe(400);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(resolveStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 ketika Origin hilang", async () => {
    const response = await POST(request(body, { origin: null }), makeContext());

    expect(response.status).toBe(403);
    const problem = await response.json();
    expect(problem.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 dan menyimpan replay ketika catatan kosong", async () => {
    const response = await POST(request({ catatanResolusi: "   " }), makeContext());

    expect(response.status).toBe(422);
    const problem = await response.json();
    expect(problem.code).toBe("VALIDATION_FAILED");
    expect(problem.errors).toEqual([expect.objectContaining({ field: "catatanResolusi" })]);
    expect(resolveStaffReportService).not.toHaveBeenCalled();
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 422 }),
    );
  });

  it("menolak payload berbeda untuk key yang sama dengan 409", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({ requestHash: "hash-beda", responseStatus: 200, responseBody: laporan }),
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const problem = await response.json();
    expect(problem.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(resolveStaffReportService).not.toHaveBeenCalled();
  });

  it("me-replay hasil tersimpan tanpa menjalankan transisi lagi", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({ responseStatus: 200, responseBody: laporan }),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(true);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(laporan);
    expect(resolveStaffReportService).not.toHaveBeenCalled();
    expect(waitForIdempotencyResult).not.toHaveBeenCalled();
  });

  it("me-replay hasil yang diselesaikan pemilik klaim setelah menunggu", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord(),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(false);
    vi.mocked(waitForIdempotencyResult).mockResolvedValue(
      claimRecord({ responseStatus: 200, responseBody: laporan }) as never,
    );

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(laporan);
    expect(resolveStaffReportService).not.toHaveBeenCalled();
    expect(waitForIdempotencyResult).toHaveBeenCalledWith({ key: KEY, principalId: 7, scope: SCOPE });
  });

  it("mengembalikan 409 selama klaim yang sama belum selesai", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord(),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(false);
    vi.mocked(waitForIdempotencyResult).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const problem = await response.json();
    expect(problem.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(problem.detail).toContain("sedang diproses");
    expect(resolveStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 dari service dan menyimpan replay", async () => {
    vi.mocked(resolveStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Laporan tidak ditemukan" },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(404);
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 404 }),
    );
  });

  it("mengembalikan 409 ketika transisi di luar state machine", async () => {
    vi.mocked(resolveStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Laporan tidak dapat diselesaikan dari status saat ini." },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const problem = await response.json();
    expect(problem.code).toBe("INVALID_REPORT_TRANSITION");
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 409 }),
    );
  });

  it("menghapus klaim dan membalas 500 ketika transaksi gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(resolveStaffReportService).mockRejectedValue(new Error("transaksi gagal"));

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(500);
    expect(deleteIdempotencyClaim).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7, scope: SCOPE }),
    );
    expect(storeIdempotencyResult).not.toHaveBeenCalled();
  });

  it("membatalkan transisi ketika klaim idempotency tidak dapat diselesaikan", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 0 } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(500);
    expect(deleteIdempotencyClaim).toHaveBeenCalled();
  });

  it("membalas 500 ketika klaim idempotency gagal dibuat", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(claimOrGetIdempotencyKey).mockRejectedValue(new Error("db mati"));

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(500);
    expect(resolveStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(401);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(403);
    expect(resolveStaffReportService).not.toHaveBeenCalled();
  });
});
