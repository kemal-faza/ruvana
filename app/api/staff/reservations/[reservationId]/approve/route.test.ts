import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { approveReservationService } from "@/lib/services/reservation-service";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/reservation-service", () => ({ approveReservationService: vi.fn() }));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const approvedResult = {
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
  status: "APPROVED",
  alasan: null,
  submittedAt: "2026-10-01T00:00:00.000Z",
  processedAt: "2026-10-02T01:00:00.000Z",
  processedBy: null,
};

function request(origin: string | null = "http://localhost:3000") {
  const headers = new Headers();
  if (origin !== null) headers.set("Origin", origin);
  return new NextRequest("http://localhost:3000/api/staff/reservations/41/approve", {
    method: "POST",
    headers,
  });
}

function makeContext(id = "41") {
  return { params: Promise.resolve({ reservationId: id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(approveReservationService).mockResolvedValue({ ok: true, data: approvedResult } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reservations/[reservationId]/approve", () => {
  it("menyetujui reservasi dengan aktor petugas dan satu waktu server", async () => {
    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(approvedResult);
    expect(approveReservationService).toHaveBeenCalledWith(7, 41, expect.any(Date));
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(401);
    expect(approveReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(403);
    expect(approveReservationService).not.toHaveBeenCalled();
  });

  it("menolak Origin yang tidak diizinkan dengan 403 CSRF_ORIGIN_REJECTED", async () => {
    const response = await POST(request("https://evil.example"), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(approveReservationService).not.toHaveBeenCalled();
  });

  it("menolak reservationId yang bukan bilangan dengan 422", async () => {
    const response = await POST(request(), makeContext("abc"));

    expect(response.status).toBe(422);
    expect(approveReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika reservasi tidak ada", async () => {
    vi.mocked(approveReservationService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Reservasi tidak ditemukan" },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("mengembalikan 409 APPROVAL_CONFLICT ketika slot bertabrakan", async () => {
    vi.mocked(approveReservationService).mockResolvedValue({
      ok: false,
      error: { type: "conflict", message: "Slot bertabrakan", availability: { slots: [] } },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("APPROVAL_CONFLICT");
  });

  it("mengembalikan 409 transisi untuk PENDING yang sudah kedaluwarsa", async () => {
    vi.mocked(approveReservationService).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Reservasi tidak berada pada status yang dapat diputuskan." },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("INVALID_RESERVATION_TRANSITION");
  });
});