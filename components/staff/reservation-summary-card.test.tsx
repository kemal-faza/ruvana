import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ReservationSummaryCard } from "@/components/staff/reservation-summary-card";
import type { StaffReservationSummary } from "@/lib/services/reservation-summary";

const RINGKASAN: StaffReservationSummary = {
  menunggu: 3,
  disetujui: 5,
  sedangBerlangsung: 2,
  ditolak: 1,
  lainnya: 4,
  total: 13,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReservationSummaryCard", () => {
  it("menampilkan jumlah per kelompok dengan label domain dan tautan Persetujuan Reservasi", () => {
    render(<ReservationSummaryCard ringkasan={RINGKASAN} />);

    expect(screen.getByText("Ringkasan reservasi")).toBeInTheDocument();
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
    expect(screen.getByText("Disetujui")).toBeInTheDocument();
    expect(screen.getByText("Ditolak")).toBeInTheDocument();
    expect(screen.getByText("Lainnya")).toBeInTheDocument();
    expect(screen.getByText("Total reservasi")).toBeInTheDocument();
    expect(screen.getByText("Sedang berlangsung")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Persetujuan Reservasi/ }),
    ).toHaveAttribute("href", "/petugas/antrian");
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.queryByText("APPROVED")).not.toBeInTheDocument();
  });

  it("menampilkan nilai nol dengan jelas beserta penjelasan saat belum ada reservasi", () => {
    render(
      <ReservationSummaryCard
        ringkasan={{ menunggu: 0, disetujui: 0, sedangBerlangsung: 0, ditolak: 0, lainnya: 0, total: 0 }}
      />,
    );

    expect(screen.getByText("Belum ada reservasi yang tercatat.")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("menampilkan skeleton saat memuat", () => {
    render(<ReservationSummaryCard ringkasan={null} loading />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("membedakan kegagalan dari ringkasan kosong dan menyediakan coba lagi", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ReservationSummaryCard ringkasan={null} gagal onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat ringkasan reservasi.");
    expect(screen.queryByText("Belum ada reservasi yang tercatat.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("lolos pemeriksaan aksesibilitas otomatis", async () => {
    const { container } = render(<ReservationSummaryCard ringkasan={RINGKASAN} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
