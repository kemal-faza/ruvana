import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/services/auth-service";
import { POST } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ registerUser: vi.fn() }));

function request(origin?: string) {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify({ nama: "Siti", email: "SITI@KAMPUS.AC.ID", password: "rahasia123" }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/register", () => {
  it("menolak Origin hilang sebelum mengakses data pendaftaran", async () => {
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CSRF_ORIGIN_REJECTED");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("mengirim user PENDING tanpa hash dan no-store", async () => {
    const user = { id: 42, nama: "Siti", email: "siti@kampus.ac.id", role: "pengguna", status: "PENDING", waktuDaftar: "2026-09-24T00:00:00.000Z", waktuVerifikasi: null };
    vi.mocked(registerUser).mockResolvedValue({ kind: "ok", user: user as never });
    const response = await POST(request("http://localhost:3000"));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ user });
  });

  it("mengembalikan konflik email dengan format problem", async () => {
    vi.mocked(registerUser).mockResolvedValue({ kind: "duplicate" });
    const response = await POST(request("http://localhost:3000"));
    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).toContain("application/problem+json");
    expect((await response.json()).code).toBe("EMAIL_ALREADY_USED");
  });
});
