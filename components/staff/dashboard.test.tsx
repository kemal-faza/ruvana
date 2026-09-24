import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StaffDashboard } from "@/components/staff/dashboard";
import type { StaffReservationResult } from "@/lib/services/reservation-service";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const reservation = {
  id: 92,
  facility: { nama: "Ruang Rapat A" },
  date: "2026-10-02",
  startTime: "09:00",
  endTime: "10:00",
  tujuanPenggunaan: "Diskusi kelompok",
  status: "PENDING",
  submittedAt: "2026-09-24T09:00:00.000Z",
  pemohon: { nama: "Siti Aminah", email: "siti@example.com" },
} as StaffReservationResult;

describe("dashboard Petugas", () => {
  it("menampilkan jumlah, pratinjau FIFO, dan pintasan ke antrean persetujuan", () => {
    render(<StaffDashboard reservations={[reservation]} totalReservations={4} />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard Petugas" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Ruang Rapat A · 2 Okt 2026 · 09:00–10:00")).toBeInTheDocument();
    expect(screen.getByText(/Siti Aminah/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buka antrean persetujuan/ })).toHaveAttribute(
      "href",
      "/petugas/antrian",
    );
  });

  it("menjelaskan antrean kosong", () => {
    render(<StaffDashboard reservations={[]} totalReservations={0} />);

    expect(screen.getByText("Belum ada reservasi menunggu.")).toBeInTheDocument();
  });

  it("membedakan kegagalan dari antrean kosong dan menyediakan retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], meta: { totalItems: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StaffDashboard reservations={[]} totalReservations={0} initialError />);

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat antrean reservasi.");
    expect(screen.queryByText("Belum ada reservasi menunggu.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText("Belum ada reservasi menunggu.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/staff/reservations?page=1&perPage=3");
  });
});
