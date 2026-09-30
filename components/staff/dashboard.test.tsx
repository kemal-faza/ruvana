import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

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

  it("menampilkan badge status domain pada antrean terbaru", () => {
    render(<StaffDashboard reservations={[reservation]} totalReservations={4} />);

    expect(screen.getByText("Menunggu")).toBeInTheDocument();
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
  });

  it("menjelaskan antrean kosong", () => {
    render(<StaffDashboard reservations={[]} totalReservations={0} />);

    expect(screen.getByText("Belum ada reservasi menunggu.")).toBeInTheDocument();
  });

  it("mengarahkan pintasan status fasilitas ke halaman kerja Petugas", () => {
    render(<StaffDashboard reservations={[]} totalReservations={0} />);

    expect(screen.getByRole("link", { name: "Lihat status operasional fasilitas" })).toHaveAttribute(
      "href",
      "/petugas/fasilitas",
    );
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

  it("menampilkan rekap bulanan setelah ringkasan", () => {
    render(
      <StaffDashboard
        reservations={[]}
        totalReservations={0}
        ringkasan={{
          menunggu: 0,
          disetujui: 0,
          sedangBerlangsung: 0,
          ditolak: 0,
          lainnya: 0,
          total: 0,
        }}
        rekap={{
          month: "2026-09",
          monthLabel: "September 2026",
          total: 5,
          perStatus: [
            { status: "PENDING", label: "Menunggu", count: 2 },
            { status: "APPROVED", label: "Disetujui", count: 3 },
            { status: "REJECTED", label: "Ditolak", count: 0 },
            { status: "CANCELLED_BY_USER", label: "Dibatalkan Pengguna", count: 0 },
            { status: "CANCELLED_BY_OFFICER", label: "Dibatalkan Petugas", count: 0 },
            { status: "EXPIRED", label: "Kedaluwarsa", count: 0 },
          ],
          perFacility: [{ facilityId: 1, facilityName: "Aula Utama", count: 5 }],
          trend: [
            { month: "2026-04", label: "April 2026", count: 1 },
            { month: "2026-05", label: "Mei 2026", count: 2 },
            { month: "2026-06", label: "Juni 2026", count: 0 },
            { month: "2026-07", label: "Juli 2026", count: 3 },
            { month: "2026-08", label: "Agustus 2026", count: 4 },
            { month: "2026-09", label: "September 2026", count: 5 },
          ],
          methodology: {
            timezone: "Asia/Jakarta",
            groupingRule: "Tanggal pemakaian.",
            statusRule: "Semua status.",
            trendRule: "6 bulan.",
            exportNote: "Tanpa ekspor.",
          },
        }}
        rekapBulan="2026-09"
      />,
    );

    expect(screen.getByText("Ringkasan reservasi")).toBeInTheDocument();
    expect(screen.getByText("Rekap bulanan")).toBeInTheDocument();
    expect(screen.getByText(/Pada September 2026 terdapat 5 reservasi/)).toBeInTheDocument();
  });

  it("aksi tunggal pada kotak galat memakai varian primary", () => {
    render(<StaffDashboard reservations={[]} totalReservations={0} rekapGagal />);
    expect(screen.getByRole("button", { name: "Coba lagi" })).toHaveClass("bg-primary-subdued");

    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(<StaffDashboard reservations={[]} totalReservations={0} initialError />);
    expect(screen.getByRole("button", { name: "Coba lagi" })).toHaveClass("bg-primary-subdued");
  });

  it("membedakan kegagalan rekap dari rekap kosong", () => {
    render(<StaffDashboard reservations={[]} totalReservations={0} rekapGagal />);

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat rekap bulanan.");
    expect(screen.queryByText("Rekap bulanan", { selector: "caption" })).not.toBeInTheDocument();
  });
});
