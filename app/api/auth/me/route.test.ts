import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentAccount } from "@/lib/services/auth-service";
import { GET } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ currentAccount: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe("GET /api/auth/me", () => {
  it("mengembalikan 401 saat sesi tidak aktif", async () => {
    vi.mocked(currentAccount).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/auth/me"));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  it("mengembalikan user aman dengan no-store", async () => {
    const user = { id: 7, nama: "Ayu", email: "ayu@kampus.ac.id", role: "pengguna", status: "ACTIVE", waktuDaftar: "2026-09-01T00:00:00.000Z", waktuVerifikasi: null };
    vi.mocked(currentAccount).mockResolvedValue(user as never);
    const response = await GET(new NextRequest("http://localhost/api/auth/me"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ user });
  });
});
