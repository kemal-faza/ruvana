import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { getMyReservationService } from "@/lib/services/reservation-service";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/reservation-service", () => ({ getMyReservationService: vi.fn() }));

const pengguna = { id: 3, nama: "Pengguna Ruvana", email: "pengguna@ruvana.test", role: "pengguna" };

const detail = {
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

function request(id = "41") {
  return new NextRequest(`http://localhost:3000/api/reservations/${id}`, { method: "GET" });
}

function makeContext(id = "41") {
  return { params: Promise.resolve({ reservationId: id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);
  vi.mocked(getMyReservationService).mockResolvedValue({ ok: true, data: detail } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/reservations/[reservationId]", () => {
  it("mengembalikan detail reservasi milik pengguna tanpa cache", async () => {
    const response = await GET(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(detail);
    expect(getMyReservationService).toHaveBeenCalledWith(3, 41);
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request(), makeContext());

    expect(response.status).toBe(401);
    expect(getMyReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role selain pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...pengguna, role: "petugas" } as never);

    const response = await GET(request(), makeContext());

    expect(response.status).toBe(403);
    expect(getMyReservationService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika reservasi milik pengguna lain", async () => {
    vi.mocked(getMyReservationService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Reservasi tidak ditemukan" },
    } as never);

    const response = await GET(request("99"), makeContext("99"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(getMyReservationService).toHaveBeenCalledWith(3, 99);
  });

  it("menolak reservationId yang bukan bilangan dengan 422", async () => {
    const response = await GET(request("abc"), makeContext("abc"));

    expect(response.status).toBe(422);
    expect(getMyReservationService).not.toHaveBeenCalled();
  });
});