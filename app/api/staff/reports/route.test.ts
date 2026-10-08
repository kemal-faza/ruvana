import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { listStaffReportQueueService } from "@/lib/services/report-processing-service";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/report-processing-service", () => ({
  listStaffReportQueueService: vi.fn(),
}));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const collection = {
  items: [],
  meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
};

function request(query = "queue=intake") {
  return new NextRequest(`http://localhost:3000/api/staff/reports?${query}`, {
    headers: new Headers({ Origin: "http://localhost:3000" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Allowlist dikunci agar hasil tes tidak bergantung pada .env pengembang.
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000");
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(listStaffReportQueueService).mockResolvedValue(collection as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/staff/reports", () => {
  it("meneruskan queue, urutan, dan paginasi ke service", async () => {
    const response = await GET(request("queue=work&sort=terbaru&page=2&perPage=10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(collection);
    expect(listStaffReportQueueService).toHaveBeenCalledWith({
      queue: "work",
      urut: "terbaru",
      page: 2,
      perPage: 10,
    });
  });

  it("memakai bawaan halaman 1, 20 item, dan urutan terlama", async () => {
    const response = await GET(request("queue=riwayat"));

    expect(response.status).toBe(200);
    expect(listStaffReportQueueService).toHaveBeenCalledWith({
      queue: "riwayat",
      urut: "terlama",
      page: 1,
      perPage: 20,
    });
  });

  it("mengembalikan 422 ketika queue tidak dikirim", async () => {
    const response = await GET(request(""));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors).toEqual([expect.objectContaining({ field: "queue", code: "REQUIRED" })]);
    expect(listStaffReportQueueService).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 ketika queue atau sort tidak dikenal", async () => {
    const queueTidakDikenal = await GET(request("queue=all"));
    const sortTidakDikenal = await GET(request("queue=intake&sort=lama"));

    expect(queueTidakDikenal.status).toBe(422);
    expect(sortTidakDikenal.status).toBe(422);
    const body = await sortTidakDikenal.json();
    expect(body.errors).toEqual([expect.objectContaining({ field: "sort", code: "INVALID_ENUM" })]);
    expect(listStaffReportQueueService).not.toHaveBeenCalled();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listStaffReportQueueService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(listStaffReportQueueService).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 ketika service gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(listStaffReportQueueService).mockRejectedValue(new Error("db mati"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
