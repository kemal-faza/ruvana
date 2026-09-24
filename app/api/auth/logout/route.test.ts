import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentAccount, logoutCurrentSession } from "@/lib/services/auth-service";
import { POST } from "./route";

vi.mock("@/lib/services/auth-service", () => ({ currentAccount: vi.fn(), logoutCurrentSession: vi.fn() }));

function request(origin?: string) {
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: origin ? { Origin: origin } : {},
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/logout", () => {
  it("membedakan sesi hilang dari Origin yang ditolak tanpa mencabut sesi", async () => {
    vi.mocked(currentAccount).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 7 } as never);
    const unauthorized = await POST(request());
    expect(unauthorized.status).toBe(401);
    const forbidden = await POST(request());
    expect(forbidden.status).toBe(403);
    expect(logoutCurrentSession).not.toHaveBeenCalled();
  });

  it("mencabut sesi aktif setelah Origin valid", async () => {
    vi.mocked(currentAccount).mockResolvedValue({ id: 7 } as never);
    const response = await POST(request("http://localhost:3000"));
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(logoutCurrentSession).toHaveBeenCalledOnce();
  });
});
