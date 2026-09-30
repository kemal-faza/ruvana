import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin }));

import PengaturanAdminPage from "@/app/admin/pengaturan/page";

beforeEach(() => vi.clearAllMocks());

describe("PengaturanAdminPage", () => {
  it("menampilkan informasi admin setelah guard dijalankan", async () => {
    requireAdmin.mockResolvedValue({
      id: 1,
      nama: "Admin Kampus",
      email: "admin@kampus.ac.id",
      role: "admin",
    });

    render(await PengaturanAdminPage());

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/Nama/)).toHaveValue("Admin Kampus");
    expect(screen.getByLabelText("Email")).toHaveValue("admin@kampus.ac.id");
  });

  it("meneruskan penolakan guard sebelum membuat halaman", async () => {
    requireAdmin.mockRejectedValue(new Error("redirect:/403"));

    await expect(PengaturanAdminPage()).rejects.toThrow("redirect:/403");
  });
});
