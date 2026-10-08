import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { getStaffReportService } from "@/lib/services/report-processing-service";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/report-processing-service", () => ({
  getStaffReportService: vi.fn(),
}));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const laporan = {
  id: 15,
  facility: {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: "Ruang kelas standar ber-AC",
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedBy: null,
  },
  pelapor: {
    id: 42,
    nama: "Siti Aminah",
    email: "siti.aminah@example.com",
    role: "pengguna",
    status: "ACTIVE",
    waktuDaftar: "2026-09-01T02:00:00.000Z",
    waktuVerifikasi: "2026-09-02T04:00:00.000Z",
  },
  kategori: "Listrik",
  deskripsi: "Lampu sisi kanan tidak menyala.",
  foto: { hasPhoto: true, contentType: "image/png", size: 245_760 },
  status: "NEW",
  catatanResolusi: null,
  ditanganiOleh: null,
  createdAt: "2026-09-09T03:35:00.000Z",
  processedAt: null,
};

function request() {
  return new NextRequest("http://localhost:3000/api/staff/reports/15", {
    headers: new Headers({ Origin: "http://localhost:3000" }),
  });
}

function makeContext(reportId = "15") {
  return { params: Promise.resolve({ reportId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(getStaffReportService).mockResolvedValue({ ok: true, data: laporan } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/staff/reports/[reportId]", () => {
  it("mengembalikan detail operasional tanpa cache", async () => {
    const response = await GET(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(laporan);
    expect(getStaffReportService).toHaveBeenCalledWith(15);
  });

  it("memasking identifier tidak valid sebagai 404 tanpa memanggil service", async () => {
    const response = await GET(request(), makeContext("abc"));

    expect(response.status).toBe(404);
    expect(getStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika laporan tidak ada", async () => {
    vi.mocked(getStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Laporan tidak ditemukan" },
    } as never);

    const response = await GET(request(), makeContext("999"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request(), makeContext());

    expect(response.status).toBe(401);
    expect(getStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await GET(request(), makeContext());

    expect(response.status).toBe(403);
    expect(getStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 ketika service gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(getStaffReportService).mockRejectedValue(new Error("db mati"));

    const response = await GET(request(), makeContext());

    expect(response.status).toBe(500);
  });
});
