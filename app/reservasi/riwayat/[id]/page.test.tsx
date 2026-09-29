import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePengguna } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));

import RiwayatDetailPage from "@/app/reservasi/riwayat/[id]/page";
import { reservasiNavigation } from "@/app/reservasi/navigation";

beforeEach(() => vi.clearAllMocks());

describe("RiwayatDetailPage", () => {
  it("mengalihkan pengunjung tanpa sesi ke halaman masuk", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/login"));

    await expect(
      RiwayatDetailPage({ params: Promise.resolve({ id: "91" }) }),
    ).rejects.toThrow("redirect:/login");

    expect(requirePengguna).toHaveBeenCalledOnce();
  });

  it("menampilkan akun sesi pengguna, bukan akun hardcode", async () => {
    requirePengguna.mockResolvedValue({
      id: 42,
      nama: "Siti Aminah",
      email: "siti.aminah@example.com",
      role: Role.pengguna,
    });

    const page = await RiwayatDetailPage({ params: Promise.resolve({ id: "91" }) });

    expect(page.props.navigation).toBe(reservasiNavigation);
    expect(page.props.account).toEqual({ displayName: "Siti Aminah", roleLabel: "Pengguna" });
  });
});
