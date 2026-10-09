import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  storeIdempotencyResult,
} from "@/lib/db/idempotency";
import { cancelReservationByOfficerService } from "@/lib/services/reservation-service";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}));
vi.mock("@/lib/services/reservation-service", () => ({
  cancelReservationByOfficerService: vi.fn(),
}));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";

const cancelledResult = {
  id: 41,
  facility: {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: "Ruang kelas standar ber-AC",
    status: "ACTIVE",
  },
  date: "2027-06-15",
  timezone: "Asia/Jakarta",
  startTime: "10:00",
  endTime: "11:00",
  startsAt: "2027-06-15T03:00:00.000Z",
  endsAt: "2027-06-15T04:00:00.000Z",
  tujuanPenggunaan: "Rapat organisasi",
  status: "CANCELLED_BY_OFFICER",
  alasan: "Fasilitas akan dipakai kegiatan kampus",
  submittedAt: "2026-10-01T00:00:00.000Z",
  processedAt: "2026-10-02T01:00:00.000Z",
  processedBy: null,
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
  return new NextRequest("http://localhost:3000/api/staff/reservations/41/cancel", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeContext(id = "41") {
  return { params: Promise.resolve({ reservationId: id }) };
}

function claimRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    key: KEY,
    principalId: 7,
    scope: "POST:/api/staff/reservations/41/cancel",
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
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: claimRecord() } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reservations/[reservationId]/cancel (mendesak)", () => {
  it("membatalkan reservasi dan menyimpan hasil idempotency dalam transaksi service", async () => {
    vi.mocked(cancelReservationByOfficerService).mockImplementation((async (
      _actorId: number,
      _id: number,
      _input: unknown,
      _now: Date,
      persist?: (tx: unknown, result: unknown) => Promise<void>,
    ) => {
      await persist?.({}, cancelledResult);
      return { ok: true, data: cancelledResult };
    }) as never);

    const response = await POST(
      request({ alasan: "Fasilitas akan dipakai kegiatan kampus" }),
      makeContext(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(cancelledResult);
    expect(cancelReservationByOfficerService).toHaveBeenCalledWith(
      7,
      41,
      { alasan: "Fasilitas akan dipakai kegiatan kampus" },
      expect.any(Date),
      expect.any(Function),
    );
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 7 }),
      { responseStatus: 200, responseBody: cancelledResult },
      expect.anything(),
    );
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request({ alasan: "Alasan valid" }), makeContext());

    expect(response.status).toBe(401);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(cancelReservationByOfficerService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await POST(request({ alasan: "Alasan valid" }), makeContext());

    expect(response.status).toBe(403);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(cancelReservationByOfficerService).not.toHaveBeenCalled();
  });

  it("menolak Origin yang tidak diizinkan dengan 403 CSRF_ORIGIN_REJECTED", async () => {
    const response = await POST(request({ alasan: "Alasan valid" }, { origin: "https://evil.example" }), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(cancelReservationByOfficerService).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 ketika Idempotency-Key bukan UUID", async () => {
    const response = await POST(request({ alasan: "Alasan valid" }, { key: "bukan-uuid" }), makeContext());

    expect(response.status).toBe(400);
    expect(cancelReservationByOfficerService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 dari service dan menyimpan replay", async () => {
    vi.mocked(cancelReservationByOfficerService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Reservasi tidak ditemukan" },
    } as never);

    const response = await POST(request({ alasan: "Alasan valid" }), makeContext());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseStatus: 404 }),
    );
  });

  it("mengembalikan 500 dan menghapus klaim agar retry bisa diproses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(cancelReservationByOfficerService).mockRejectedValue(new Error("db mati"));

    const response = await POST(request({ alasan: "Alasan valid" }), makeContext());

    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe("INTERNAL_ERROR");
    // 5xx tidak disimpan untuk replay: klaim dihapus supaya percobaan ulang
    // tidak menerima hasil gagal yang tersimpan.
    expect(storeIdempotencyResult).not.toHaveBeenCalled();
    expect(deleteIdempotencyClaim).toHaveBeenCalledWith(expect.objectContaining({ key: KEY, principalId: 7 }));
  });
});