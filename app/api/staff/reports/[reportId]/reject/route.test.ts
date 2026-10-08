import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  storeIdempotencyResult,
} from "@/lib/db/idempotency";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import { rejectStaffReportService } from "@/lib/services/report-processing-service";

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
  rejectStaffReportService: vi.fn(),
}));

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";
const SCOPE = "POST:/api/staff/reports/15/reject";
const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const laporan = {
  id: 15,
  facility: { id: 1, nama: "RK-101" },
  kategori: "Listrik",
  deskripsi: "Lampu sisi kanan tidak menyala.",
  foto: { hasPhoto: true, contentType: "image/png", size: 245_760 },
  status: "REJECTED",
  catatanResolusi: "Tidak dapat diverifikasi di lokasi.",
  ditanganiOleh: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
  createdAt: "2026-09-09T03:35:00.000Z",
  processedAt: "2026-09-10T06:00:00.000Z",
};

const body = { catatanResolusi: "Tidak dapat diverifikasi di lokasi." };

function request(
  payload: unknown = body,
  overrides: { key?: string | null; origin?: string | null } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/staff/reports/15/reject", {
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
    claimed: true,
    record: claimRecord(),
  } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
  vi.mocked(rejectStaffReportService).mockImplementation((async (
    _staffId: number,
    _id: number,
    _catatan: string,
    _now: Date,
    persist?: (tx: unknown, result: unknown) => Promise<void>,
  ) => {
    await persist?.({}, laporan);
    return { ok: true, data: laporan };
  }) as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reports/[reportId]/reject", () => {
  it("menolak laporan dengan catatan dan menyimpan hasil idempotency di transaksi", async () => {
    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(laporan);
    expect(rejectStaffReportService).toHaveBeenCalledWith(
      7,
      15,
      "Tidak dapat diverifikasi di lokasi.",
      expect.any(Date),
      expect.any(Function),
    );
    expect(claimOrGetIdempotencyKey).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7, scope: SCOPE }),
    );
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      { responseStatus: 200, responseBody: laporan },
      expect.anything(),
    );
  });

  it("memakai scope reject sehingga hasil tidak dapat di-replay lintas aksi", async () => {
    await POST(request(), makeContext());

    const arg = vi.mocked(claimOrGetIdempotencyKey).mock.calls[0][0] as { scope: string };
    expect(arg.scope).toBe(SCOPE);
    expect(arg.scope).not.toContain("resolve");
  });

  it("mengembalikan 400 ketika Idempotency-Key bukan UUID", async () => {
    const response = await POST(request(body, { key: "bukan-uuid" }), makeContext());

    expect(response.status).toBe(400);
    expect(rejectStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 ketika Origin hilang", async () => {
    const response = await POST(request(body, { origin: null }), makeContext());

    expect(response.status).toBe(403);
    const problem = await response.json();
    expect(problem.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 dan menyimpan replay ketika catatan penyelesaian kosong", async () => {
    const response = await POST(request({ catatanResolusi: "" }), makeContext());

    expect(response.status).toBe(422);
    expect(rejectStaffReportService).not.toHaveBeenCalled();
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
      expect.objectContaining({ responseStatus: 422 }),
    );
  });

  it("mengembalikan 409 ketika transisi di luar state machine", async () => {
    vi.mocked(rejectStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Laporan tidak dapat ditolak dari status saat ini." },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const problem = await response.json();
    expect(problem.code).toBe("INVALID_REPORT_TRANSITION");
  });

  it("mengembalikan 404 ketika laporan tidak ada", async () => {
    vi.mocked(rejectStaffReportService).mockResolvedValue({
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

  it("menghapus klaim dan membalas 500 ketika transaksi gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(rejectStaffReportService).mockRejectedValue(new Error("transaksi gagal"));

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(500);
    expect(deleteIdempotencyClaim).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7, scope: SCOPE }),
    );
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(401);
    expect(rejectStaffReportService).not.toHaveBeenCalled();
  });
});
