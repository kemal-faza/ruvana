import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { listStaffReportWork } from "@/lib/services/report-service";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/report-service", () => ({ listStaffReportWork: vi.fn() }));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const ringkasan = {
  NEW: { total: 1, items: [] },
  IN_PROGRESS: { total: 0, items: [] },
};

function request() {
  return new NextRequest("http://localhost:3000/api/staff/reports/summary", {
    headers: new Headers({ Origin: "http://localhost:3000" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(listStaffReportWork).mockResolvedValue(ringkasan as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/staff/reports/summary", () => {
  it("mengembalikan ringkasan pekerjaan tanpa cache", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(ringkasan);
    expect(listStaffReportWork).toHaveBeenCalledOnce();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listStaffReportWork).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(listStaffReportWork).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 ketika service gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(listStaffReportWork).mockRejectedValue(new Error("db mati"));

    const response = await GET(request());

    expect(response.status).toBe(500);
  });
});
