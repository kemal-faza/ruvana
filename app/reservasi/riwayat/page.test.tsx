import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePengguna } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));

import RiwayatReservasiPage from "@/app/reservasi/riwayat/page";
import { reservasiNavigation } from "@/app/reservasi/navigation";

beforeEach(() => vi.clearAllMocks());

describe("RiwayatReservasiPage", () => {
  it("mengalihkan pengunjung tanpa sesi ke halaman masuk", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/login"));

    await expect(RiwayatReservasiPage()).rejects.toThrow("redirect:/login");

    expect(requirePengguna).toHaveBeenCalledOnce();
  });

  it("menampilkan akun sesi pengguna, bukan akun hardcode", async () => {
    requirePengguna.mockResolvedValue({
      id: 42,
      nama: "Siti Aminah",
      email: "siti.aminah@example.com",
      role: Role.pengguna,
    });

    const page = await RiwayatReservasiPage();

    expect(page.props.navigation).toBe(reservasiNavigation);
    expect(page.props.account).toEqual({ displayName: "Siti Aminah", roleLabel: "Pengguna" });
  });
});
