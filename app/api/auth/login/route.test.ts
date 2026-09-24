import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithCredentials } from "@/lib/services/auth-service";
import { POST } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ loginWithCredentials: vi.fn() }));

function request(origin?: string) {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify({ email: "USER@KAMPUS.AC.ID", password: "rahasia123" }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/login", () => {
  it("menolak Origin yang hilang sebelum membaca kredensial", async () => {
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CSRF_ORIGIN_REJECTED");
    expect(loginWithCredentials).not.toHaveBeenCalled();
  });

  it("mengirim user aman, expiry, dan no-store setelah login", async () => {
    const user = { id: 7, nama: "Ayu", email: "ayu@kampus.ac.id", role: "pengguna", status: "ACTIVE", waktuDaftar: "2026-09-01T00:00:00.000Z", waktuVerifikasi: null };
    vi.mocked(loginWithCredentials).mockResolvedValue({ kind: "ok", user: user as never, expiresAt: "2026-09-25T00:00:00.000Z" });
    const response = await POST(request("http://localhost:3000"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ user, expiresAt: "2026-09-25T00:00:00.000Z" });
    expect(loginWithCredentials).toHaveBeenCalledWith({ email: "USER@KAMPUS.AC.ID", password: "rahasia123" }, "unknown");
  });

  it("mengirim kegagalan kredensial generik dan batas percobaan", async () => {
    vi.mocked(loginWithCredentials).mockResolvedValueOnce({ kind: "invalid" }).mockResolvedValueOnce({ kind: "rate_limited" });
    const invalid = await POST(request("http://localhost:3000"));
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).code).toBe("INVALID_CREDENTIALS");
    const limited = await POST(request("http://localhost:3000"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("900");
  });
});
