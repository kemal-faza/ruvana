import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup";

const { requirePengguna } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/reservasi/riwayat",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/reservation/reservation-history-list", () => ({
  ReservationHistoryList: () => <p>Daftar reservasi</p>,
}));

import RiwayatReservasiPage from "@/app/reservasi/riwayat/page";
import { reservasiNavigation } from "@/app/reservasi/navigation";

function penggunaAktif() {
  return {
    id: 42,
    nama: "Siti Aminah",
    email: "siti.aminah@example.com",
    role: Role.pengguna,
  };
}

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  cleanup();
  resetMatchMedia();
});

describe("RiwayatReservasiPage", () => {
  it("mengalihkan pengunjung tanpa sesi ke halaman masuk", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/login"));

    await expect(RiwayatReservasiPage()).rejects.toThrow("redirect:/login");

    expect(requirePengguna).toHaveBeenCalledOnce();
  });

  it("menampilkan akun sesi pengguna, bukan akun hardcode", async () => {
    requirePengguna.mockResolvedValue(penggunaAktif());

    const page = await RiwayatReservasiPage();

    expect(page.props.navigation).toBe(reservasiNavigation);
    expect(page.props.account).toEqual({ displayName: "Siti Aminah", roleLabel: "Pengguna" });
  });

  it("memakai judul halaman Reservasi dan tombol Ajukan Reservasi menuju form pengajuan", async () => {
    setMatchMedia("(max-width: 1023px)", false);
    requirePengguna.mockResolvedValue(penggunaAktif());

    render(await RiwayatReservasiPage());

    expect(screen.getByRole("heading", { level: 1, name: "Reservasi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajukan Reservasi" })).toHaveAttribute(
      "href",
      "/reservasi",
    );
  });
});
