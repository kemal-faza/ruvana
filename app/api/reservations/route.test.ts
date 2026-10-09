import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  claimOrGetIdempotencyKey,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency";
import { hashCanonicalBody } from "@/lib/http/idempotency";
import {
  createReservationService,
  listMyReservationsService,
} from "@/lib/services/reservation-service";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}));
vi.mock("@/lib/services/reservation-service", () => ({
  createReservationService: vi.fn(),
  listMyReservationsService: vi.fn(),
}));

const pengguna = { id: 3, nama: "Pengguna Ruvana", email: "pengguna@ruvana.test", role: "pengguna" };

const KEY = "2c1f4a3e-7e71-4d5c-8f1c-0f0d9e5f1a11";

const reservationResult = {
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
  status: "PENDING",
  alasan: null,
  submittedAt: "2026-10-01T00:00:00.000Z",
  processedAt: null,
  processedBy: null,
};

const validBody = {
  facilityId: 1,
  date: "2027-06-15",
  startTime: "10:00",
  endTime: "11:00",
  tujuanPenggunaan: "Rapat organisasi",
};

function getRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/reservations${query}`, { method: "GET" });
}

function postRequest(
  body: unknown,
  overrides: { key?: string | null; origin?: string | null } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const origin = overrides.origin === undefined ? "http://localhost:3000" : overrides.origin;
  if (origin !== null) headers.set("Origin", origin);
  const key = overrides.key === undefined ? KEY : overrides.key;
  if (key !== null) headers.set("Idempotency-Key", key);
  return new NextRequest("http://localhost:3000/api/reservations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function claimRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    key: KEY,
    principalId: 3,
    scope: "POST:/api/reservations",
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
  vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: claimRecord() } as never);
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never);
  vi.mocked(waitForIdempotencyResult).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/reservations", () => {
  it("membuat reservasi dan menyimpan hasil idempotency dalam transaksi service", async () => {
    vi.mocked(createReservationService).mockImplementation((async (
      _userId: number,
      _input: unknown,
      _now: Date,
      persist?: (tx: unknown, result: unknown) => Promise<void>,
    ) => {
      await persist?.({}, reservationResult);
      return { ok: true, data: reservationResult };
    }) as never);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(reservationResult);
    expect(createReservationService).toHaveBeenCalledWith(3, validBody, expect.any(Date), expect.any(Function));
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 3 }),
      { responseStatus: 201, responseBody: reservationResult },
      expect.anything(),
    );
  });

  it("mengabaikan field waktu pengajuan dari klien (RES-01): waktu dicatat server", async () => {
    vi.mocked(createReservationService).mockResolvedValue({ ok: true, data: reservationResult } as never);
    const body = { ...validBody, waktuPengajuan: "2030-01-01T00:00:00.000Z" };

    const response = await POST(postRequest(body));

    expect(response.status).toBe(201);
    const callArgs = vi.mocked(createReservationService).mock.calls[0]!;
    expect(callArgs[1]).toEqual(validBody);
    expect(callArgs[1]).not.toHaveProperty("waktuPengajuan");
    const now = callArgs[2] as Date;
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).not.toBe(new Date("2030-01-01T00:00:00.000Z").getTime());
  });

  it("mengembalikan 401 tanpa sesi dan tidak menyentuh idempotency", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(401);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role selain pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...pengguna, role: "petugas" } as never);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(403);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("menolak Origin yang tidak diizinkan dengan 403 CSRF_ORIGIN_REJECTED", async () => {
    const response = await POST(postRequest(validBody, { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 ketika Idempotency-Key bukan UUID", async () => {
    const response = await POST(postRequest(validBody, { key: "bukan-uuid" }));

    expect(response.status).toBe(400);
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled();
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("submit ganda aman: key sama me-replay hasil pertama tanpa memanggil service lagi", async () => {
    vi.mocked(createReservationService).mockImplementation((async (
      _userId: number,
      _input: unknown,
      _now: Date,
      persist?: (tx: unknown, result: unknown) => Promise<void>,
    ) => {
      await persist?.({}, reservationResult);
      return { ok: true, data: reservationResult };
    }) as never);

    const first = await POST(postRequest(validBody));
    expect(first.status).toBe(201);
    expect(createReservationService).toHaveBeenCalledTimes(1);

    // Replay dibangun dari apa yang benar-benar disimpan request pertama,
    // bukan dari record yang disusun tangan seperti sebelumnya.
    const tersimpan = vi.mocked(storeIdempotencyResult).mock.calls[0]!;
    expect(tersimpan[1]).toEqual({ responseStatus: 201, responseBody: reservationResult });

    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({
        requestHash: hashCanonicalBody(validBody),
        responseStatus: tersimpan[1].responseStatus,
        responseBody: tersimpan[1].responseBody,
      }),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(true);

    const second = await POST(postRequest(validBody));

    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(reservationResult);
    expect(createReservationService).toHaveBeenCalledTimes(1);
    expect(waitForIdempotencyResult).not.toHaveBeenCalled();
  });

  it("submit bersamaan menunggu hasil pemroses dan me-replay-nya", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({
        requestHash: hashCanonicalBody(validBody),
        responseStatus: null,
        responseBody: null,
      }),
    } as never);
    vi.mocked(isIdempotencySettled).mockReturnValue(false);
    vi.mocked(waitForIdempotencyResult).mockResolvedValue({
      requestHash: hashCanonicalBody(validBody),
      responseStatus: 201,
      responseBody: reservationResult,
    } as never);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(reservationResult);
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("menolak payload berbeda untuk key yang sama dengan 409", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({
      claimed: false,
      record: claimRecord({ requestHash: "hash-payload-beda" }),
    } as never);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(createReservationService).not.toHaveBeenCalled();
  });

  it("menyimpan replay 422 untuk body yang gagal validasi", async () => {
    const response = await POST(postRequest({ ...validBody, startTime: "09:15" }));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(createReservationService).not.toHaveBeenCalled();
    expect(storeIdempotencyResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, principalId: 3 }),
      expect.objectContaining({ responseStatus: 422 }),
    );
  });
});

describe("GET /api/reservations filter status", () => {
  it("meneruskan CANCELLED_BY_OFFICER ke service dan mengembalikan 200", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);
    const data = { items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } };
    vi.mocked(listMyReservationsService).mockResolvedValue({ ok: true, data } as never);

    const response = await GET(getRequest("?status=CANCELLED_BY_OFFICER&perPage=10"));

    expect(response.status).toBe(200);
    expect(listMyReservationsService).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ status: "CANCELLED_BY_OFFICER" }),
    );
    expect(await response.json()).toEqual(data);
  });

  it("menerima semua enum status tanpa error", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);
    vi.mocked(listMyReservationsService).mockResolvedValue({
      ok: true,
      data: { items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } },
    } as never);

    for (const status of [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_OFFICER",
      "EXPIRED",
    ]) {
      const response = await GET(getRequest(`?status=${status}`));
      expect(response.status).toBe(200);
    }
  });

  it("menolak nilai di luar whitelist dengan 422", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);

    const response = await GET(getRequest("?status=approvel_by_petugs"));

    expect(response.status).toBe(422);
    expect(listMyReservationsService).not.toHaveBeenCalled();
  });

  it("menolak akses tanpa sesi dengan 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(getRequest("?status=CANCELLED_BY_OFFICER"));

    expect(response.status).toBe(401);
    expect(listMyReservationsService).not.toHaveBeenCalled();
  });
});