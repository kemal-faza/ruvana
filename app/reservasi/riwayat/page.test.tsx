import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup";

const { requirePengguna, getMaintenanceCancellationSummaryService } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
  getMaintenanceCancellationSummaryService: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));
vi.mock("@/lib/services/reservation-service", () => ({ getMaintenanceCancellationSummaryService }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/reservasi/riwayat",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/reservation/reservation-history-list", () => ({
  ReservationHistoryList: ({ pembatalanPemeliharaan }: { pembatalanPemeliharaan?: { total: number } }) => (
    <p>Daftar reservasi:{pembatalanPemeliharaan?.total ?? "kosong"}</p>
  ),
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

beforeEach(() => {
  vi.clearAllMocks();
  getMaintenanceCancellationSummaryService.mockResolvedValue({ total: 0, namaFasilitas: [] });
});

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

  it("menghitung ringkasan pemeliharaan milik sesi dan meneruskannya ke daftar riwayat", async () => {
    requirePengguna.mockResolvedValue(penggunaAktif());
    getMaintenanceCancellationSummaryService.mockResolvedValue({
      total: 4,
      namaFasilitas: ["Lab Kimia"],
    });

    render(await RiwayatReservasiPage());

    expect(getMaintenanceCancellationSummaryService).toHaveBeenCalledWith(42);
    expect(screen.getByText("Daftar reservasi:4")).toBeInTheDocument();
  });

  it("tetap merender daftar riwayat saat hitungan ringkasan gagal", async () => {
    requirePengguna.mockResolvedValue(penggunaAktif());
    getMaintenanceCancellationSummaryService.mockRejectedValue(new Error("database mati"));
    const catatGalat = vi.spyOn(console, "error").mockImplementation(() => {});

    render(await RiwayatReservasiPage());

    expect(screen.getByText("Daftar reservasi:0")).toBeInTheDocument();
    expect(catatGalat).toHaveBeenCalled();
    catatGalat.mockRestore();
  });
});
