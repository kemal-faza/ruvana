import { afterEach, describe, expect, it, vi } from "vitest";

import { logoutFromBrowser } from "@/lib/auth-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("logoutFromBrowser", () => {
  it("membuka login dan menyegarkan data setelah sesi diakhiri", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const router = { replace: vi.fn(), refresh: vi.fn() };

    await logoutFromBrowser(router);

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("tetap di halaman saat API gagal mengakhiri sesi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    const router = { replace: vi.fn(), refresh: vi.fn() };

    await expect(logoutFromBrowser(router)).rejects.toThrow("Gagal keluar. Coba lagi.");

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
