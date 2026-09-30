import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requirePengguna } = vi.hoisted(() => ({ requirePengguna: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requirePengguna }));

import PengaturanAkunPage from "@/app/pengaturan/page";

beforeEach(() => vi.clearAllMocks());

describe("PengaturanAkunPage", () => {
  it("menampilkan informasi akun pengguna setelah guard dijalankan", async () => {
    requirePengguna.mockResolvedValue({
      id: 7,
      nama: "Siti Aminah",
      email: "siti@kampus.ac.id",
      role: "pengguna",
    });

    render(await PengaturanAkunPage());

    expect(requirePengguna).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/Nama/)).toHaveValue("Siti Aminah");
    expect(screen.getByLabelText("Email")).toHaveValue("siti@kampus.ac.id");
  });

  it("meneruskan penolakan guard sebelum membuat halaman", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/403"));

    await expect(PengaturanAkunPage()).rejects.toThrow("redirect:/403");
  });
});
