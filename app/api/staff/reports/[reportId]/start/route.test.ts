import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { startStaffReportService } from "@/lib/services/report-processing-service";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/report-processing-service", () => ({
  startStaffReportService: vi.fn(),
}));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const laporan = {
  id: 15,
  facility: { id: 1, nama: "RK-101" },
  kategori: "Listrik",
  deskripsi: "Lampu sisi kanan tidak menyala.",
  foto: { hasPhoto: true, contentType: "image/png", size: 245_760 },
  status: "IN_PROGRESS",
  catatanResolusi: null,
  ditanganiOleh: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
  createdAt: "2026-09-09T03:35:00.000Z",
  processedAt: "2026-09-09T05:00:00.000Z",
};

function request(origin: string | null = "http://localhost:3000") {
  const headers = new Headers();
  if (origin !== null) headers.set("Origin", origin);
  return new NextRequest("http://localhost:3000/api/staff/reports/15/start", { method: "POST", headers });
}

function makeContext(reportId = "15") {
  return { params: Promise.resolve({ reportId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(startStaffReportService).mockResolvedValue({ ok: true, data: laporan } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reports/[reportId]/start", () => {
  it("memulai penanganan dengan aktor dan satu waktu server", async () => {
    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(laporan);
    expect(startStaffReportService).toHaveBeenCalledWith(7, 15, expect.any(Date));
  });

  it("mengembalikan 403 ketika Origin hilang", async () => {
    const response = await POST(request(null), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(startStaffReportService).not.toHaveBeenCalled();
  });

  it("memasking identifier tidak valid sebagai 404", async () => {
    const response = await POST(request(), makeContext("abc"));

    expect(response.status).toBe(404);
    expect(startStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika laporan tidak ada", async () => {
    vi.mocked(startStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "not_found", message: "Laporan tidak ditemukan" },
    } as never);

    const response = await POST(request(), makeContext("999"));

    expect(response.status).toBe(404);
  });

  it("mengembalikan 409 ketika transisi di luar state machine", async () => {
    vi.mocked(startStaffReportService).mockResolvedValue({
      ok: false,
      error: { type: "transition", message: "Laporan tidak dapat dimulai dari status saat ini." },
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("INVALID_REPORT_TRANSITION");
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(401);
    expect(startStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(403);
    expect(startStaffReportService).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 ketika service gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(startStaffReportService).mockRejectedValue(new Error("db mati"));

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(500);
  });
});
