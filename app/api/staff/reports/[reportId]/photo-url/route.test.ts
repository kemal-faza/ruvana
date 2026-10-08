import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { findReportPhotoById } from "@/lib/db/reports";
import { createReportPhotoReadUrl } from "@/lib/storage/report-photo";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db/reports", () => ({ findReportPhotoById: vi.fn() }));
vi.mock("@/lib/storage/report-photo", () => ({ createReportPhotoReadUrl: vi.fn() }));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };
const PATHNAME = "reports/42/8b7c2d1e-panel-listrik.png";

function request(origin: string | null = "http://localhost:3000") {
  const headers = new Headers();
  if (origin !== null) headers.set("Origin", origin);
  return new NextRequest("http://localhost:3000/api/staff/reports/15/photo-url", { method: "POST", headers });
}

function makeContext(reportId = "15") {
  return { params: Promise.resolve({ reportId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(findReportPhotoById).mockResolvedValue({
    id: 15,
    userId: 42,
    foto: PATHNAME,
    fotoContentType: "image/png",
    fotoSize: 245_760,
  } as never);
  vi.mocked(createReportPhotoReadUrl).mockResolvedValue("https://blob.example.invalid/signed") as never;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/staff/reports/[reportId]/photo-url", () => {
  it("menerbitkan URL baca sementara selama 5 menit", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-03T05:00:00.000Z") });

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      url: "https://blob.example.invalid/signed",
      expiresAt: "2026-10-03T05:05:00.000Z",
    });
    expect(findReportPhotoById).toHaveBeenCalledWith(15);
    expect(createReportPhotoReadUrl).toHaveBeenCalledWith(PATHNAME);
  });

  it("tidak pernah mengembalikan pathname foto private", async () => {
    vi.mocked(createReportPhotoReadUrl).mockResolvedValue("https://blob.example.invalid/signed");

    const response = await POST(request(), makeContext());

    expect(JSON.stringify(await response.json())).not.toContain("reports/42/");
  });

  it("mengembalikan 403 ketika Origin hilang", async () => {
    const response = await POST(request(null), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("CSRF_ORIGIN_REJECTED");
    expect(findReportPhotoById).not.toHaveBeenCalled();
  });

  it("memasking identifier tidak valid sebagai 404", async () => {
    const response = await POST(request(), makeContext("abc"));

    expect(response.status).toBe(404);
    expect(findReportPhotoById).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika laporan tidak ada", async () => {
    vi.mocked(findReportPhotoById).mockResolvedValue(null as never);

    const response = await POST(request(), makeContext("999"));

    expect(response.status).toBe(404);
    expect(createReportPhotoReadUrl).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 ketika laporan tidak punya foto", async () => {
    vi.mocked(findReportPhotoById).mockResolvedValue({
      id: 15,
      userId: 42,
      foto: null,
      fotoContentType: null,
      fotoSize: null,
    } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(404);
    expect(createReportPhotoReadUrl).not.toHaveBeenCalled();
  });

  it("mengembalikan 502 ketika penyimpanan foto gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createReportPhotoReadUrl).mockRejectedValue(new Error("blob mati"));

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe("BLOB_UPSTREAM_FAILURE");
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(401);
    expect(findReportPhotoById).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await POST(request(), makeContext());

    expect(response.status).toBe(403);
    expect(findReportPhotoById).not.toHaveBeenCalled();
  });
});
