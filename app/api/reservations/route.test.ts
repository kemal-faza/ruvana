import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/lib/auth";
import { listMyReservationsService } from "@/lib/services/reservation-service";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/services/reservation-service", () => ({ listMyReservationsService: vi.fn() }));

const pengguna = { id: 3, nama: "Pengguna Ruvana", email: "pengguna@ruvana.test", role: "pengguna" };

function request(query: string) {
  return new NextRequest(`http://localhost:3000/api/reservations${query}`, { method: "GET" });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/reservations filter status", () => {
  it("meneruskan CANCELLED_BY_OFFICER ke service dan mengembalikan 200", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);
    const data = { items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } };
    vi.mocked(listMyReservationsService).mockResolvedValue({ ok: true, data } as never);

    const response = await GET(request("?status=CANCELLED_BY_OFFICER&perPage=10"));

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
      const response = await GET(request(`?status=${status}`));
      expect(response.status).toBe(200);
    }
  });

  it("menolak nilai di luar whitelist dengan 422", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(pengguna as never);

    const response = await GET(request("?status=approvel_by_petugs"));

    expect(response.status).toBe(422);
    expect(listMyReservationsService).not.toHaveBeenCalled();
  });

  it("menolak akses tanpa sesi dengan 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await GET(request("?status=CANCELLED_BY_OFFICER"));

    expect(response.status).toBe(401);
    expect(listMyReservationsService).not.toHaveBeenCalled();
  });
});
