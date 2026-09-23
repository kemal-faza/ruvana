import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expirePendingReservations } from "@/lib/reservations/expiry";

import { GET } from "./route";

vi.mock("@/lib/reservations/expiry", () => ({
  expirePendingReservations: vi.fn(),
}));

const SECRET = "kunci-cron-uji-minimal-32-karakter-1234";

function requestWith(auth: string | null): NextRequest {
  const headers = new Headers();
  if (auth !== null) headers.set("authorization", auth);
  return new NextRequest("http://localhost/api/cron/expire-reservations", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/expire-reservations", () => {
  it("menjalankan expiry dan mengembalikan jumlah dengan bearer valid", async () => {
    vi.mocked(expirePendingReservations).mockResolvedValue({ count: 3 });

    const response = await GET(requestWith(`Bearer ${SECRET}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.expired).toBe(3);
    expect(typeof body.processedAt).toBe("string");
    expect(expirePendingReservations).toHaveBeenCalledTimes(1);
  });

  it("menolak tanpa atau dengan bearer salah tanpa menjalankan expiry", async () => {
    // Nilai header di-trim oleh implementasi Headers, jadi kasus trailing
    // space tidak diuji di sini — yang penting hanya kecocokan exact.
    for (const auth of [null, "Bearer salah", "Basic abc", "Bearer"]) {
      const response = await GET(requestWith(auth));
      expect(response.status).toBe(401);
    }
    expect(expirePendingReservations).not.toHaveBeenCalled();
  });

  it("gagal tertutup 500 bila CRON_SECRET belum dikonfigurasi", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(requestWith("Bearer apa-pun"));

    expect(response.status).toBe(500);
    expect(expirePendingReservations).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 aman saat expiry gagal", async () => {
    vi.mocked(expirePendingReservations).mockRejectedValue(new Error("db down"));

    const response = await GET(requestWith(`Bearer ${SECRET}`));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
