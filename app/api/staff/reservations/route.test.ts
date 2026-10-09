import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import {
  listStaffApprovedService,
  listStaffQueueService,
} from "@/lib/services/reservation-service";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/reservation-service", () => ({
  listStaffApprovedService: vi.fn(),
  listStaffQueueService: vi.fn(),
}));

const petugas = { id: 7, nama: "Petugas Ruvana", email: "petugas@ruvana.test", role: "petugas" };

const collection = {
  items: [],
  meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
};

function request(query = "") {
  return new NextRequest(`http://localhost:3000/api/staff/reservations?${query}`, {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue(petugas as never);
  vi.mocked(listStaffQueueService).mockResolvedValue({ ok: true, data: collection } as never);
  vi.mocked(listStaffApprovedService).mockResolvedValue({ ok: true, data: collection } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/staff/reservations (antrean)", () => {
  it("meneruskan status PENDING dan paginasi ke listStaffQueueService", async () => {
    const response = await GET(request("status=PENDING&page=2&perPage=10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(collection);
    expect(listStaffQueueService).toHaveBeenCalledWith({ status: "PENDING", page: 2, perPage: 10 });
    expect(listStaffApprovedService).not.toHaveBeenCalled();
  });

  it("menggunakan bawaan PENDING halaman 1 dan 20 item", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(listStaffQueueService).toHaveBeenCalledWith({ status: "PENDING", page: 1, perPage: 20 });
  });

  it("meneruskan status APPROVED ke listStaffApprovedService", async () => {
    const response = await GET(request("status=APPROVED"));

    expect(response.status).toBe(200);
    expect(listStaffApprovedService).toHaveBeenCalledWith({ status: "APPROVED", page: 1, perPage: 20 });
    expect(listStaffQueueService).not.toHaveBeenCalled();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request("status=PENDING"));

    expect(response.status).toBe(401);
    expect(listStaffQueueService).not.toHaveBeenCalled();
    expect(listStaffApprovedService).not.toHaveBeenCalled();
  });

  it("mengembalikan 403 untuk role pengguna", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...petugas, role: "pengguna" } as never);

    const response = await GET(request("status=PENDING"));

    expect(response.status).toBe(403);
    expect(listStaffQueueService).not.toHaveBeenCalled();
    expect(listStaffApprovedService).not.toHaveBeenCalled();
  });

  it("menolak status di luar PENDING/APPROVED dengan 422", async () => {
    const response = await GET(request("status=REJECTED"));

    expect(response.status).toBe(422);
    expect(listStaffQueueService).not.toHaveBeenCalled();
    expect(listStaffApprovedService).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 ketika pengambilan antrean gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(listStaffQueueService).mockRejectedValue(new Error("db mati"));

    const response = await GET(request("status=PENDING"));

    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe("INTERNAL_ERROR");
  });

  it("mengembalikan 500 ketika pengambilan daftar APPROVED gagal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(listStaffApprovedService).mockRejectedValue(new Error("db mati"));

    const response = await GET(request("status=APPROVED"));

    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe("INTERNAL_ERROR");
  });
});