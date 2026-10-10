import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetMatchMedia, setMatchMedia } from "@/vitest.setup";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reservasi/riwayat",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/reservation/reservation-history-list", () => ({
  ReservationHistoryList: () => <p>Daftar reservasi</p>,
}));

import RiwayatReservasiPage from "@/app/reservasi/riwayat/page";

afterEach(() => {
  cleanup();
  resetMatchMedia();
});

describe("RiwayatReservasiPage", () => {
  it("memakai judul halaman Reservasi dan tombol Ajukan Reservasi menuju form pengajuan", () => {
    setMatchMedia("(max-width: 1023px)", false);

    render(<RiwayatReservasiPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reservasi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajukan Reservasi" })).toHaveAttribute(
      "href",
      "/reservasi",
    );
  });

  it("tidak merender shell karena disediakan layout segmen", () => {
    setMatchMedia("(max-width: 1023px)", false);

    render(<RiwayatReservasiPage />);

    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
