import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// Island pemilih bulan memakai useRouter; navigasi tidak diuji di sini
// (lihat recap-month-picker.test.tsx), jadi cukup mock agar stabil.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { StaffMonthlyRecap } from "@/components/staff/monthly-recap";
import type { StaffMonthlyRecap as Rekap } from "@/lib/services/staff-monthly-recap";

function buatRekap(ubah?: Partial<Rekap>): Rekap {
  return {
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
      groupingRule: "Dikelompokkan berdasarkan tanggal pemakaian (kolom tanggal) dalam kalender Asia/Jakarta, bukan waktu pengajuan.",
      statusRule: "Seluruh status reservasi dihitung; bulan tanpa data menampilkan 0.",
      trendRule: "Tren memuat 6 bulan terakhir termasuk bulan terpilih.",
      exportNote: "Ekspor rekap berada di luar scope.",
    },
    ...ubah,
  };
}

afterEach(() => {
  cleanup();
});

describe("StaffMonthlyRecap", () => {
  it("menampilkan ringkasan tertulis sebelum tabel", () => {
    render(<StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />);

    expect(screen.getByText("Rekap bulanan")).toBeInTheDocument();
    const ringkasan = screen.getByText(/Pada September 2026 terdapat 5 reservasi/);
    expect(ringkasan).toBeInTheDocument();
    expect(screen.getByText(/tanggal pemakaian/i)).toBeInTheDocument();
  });

  it("menyediakan pemilih bulan lewat form GET berlabel yang bisa dipakai keyboard", () => {
    render(<StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />);

    const form = screen.getByRole("form", { name: "Pilih bulan rekap" });
    expect(form).toHaveAttribute("action", "/petugas");
    expect(form).toHaveAttribute("method", "get");
    const masukanBulan = screen.getByLabelText("Bulan");
    const masukanTahun = screen.getByLabelText("Tahun");
    expect(masukanBulan.tagName).toBe("SELECT");
    expect(masukanBulan).toHaveAttribute("name", "bulan");
    expect(masukanBulan).toHaveValue("09");
    expect(masukanTahun).toHaveAttribute("name", "tahun");
    expect(masukanTahun).toHaveValue(2026);
    expect(screen.getByRole("button", { name: "Tampilkan rekap" })).toBeInTheDocument();
  });

  it("menampilkan pesan jelas saat param bulan tidak valid jatuh ke default", () => {
    render(
      <StaffMonthlyRecap
        recap={buatRekap()}
        currentMonth="2026-10"
        warning="Parameter bulan tidak valid, menampilkan rekap bulan Oktober 2026."
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Parameter bulan tidak valid, menampilkan rekap bulan Oktober 2026.",
    );
  });

  it("menampilkan tabel per status dengan label domain dan nol eksplisit", () => {
    render(<StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />);

    const tabel = screen.getByRole("table", { name: "Jumlah reservasi per status" });
    expect(within(tabel).getByText("Menunggu")).toBeInTheDocument();
    expect(within(tabel).getByText("Disetujui")).toBeInTheDocument();
    expect(within(tabel).getByText("Kedaluwarsa")).toBeInTheDocument();
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.queryByText("APPROVED")).not.toBeInTheDocument();
  });

  it("menampilkan nol bukan error untuk bulan tanpa data beserta aksi berikutnya", () => {
    const kosong = buatRekap({ total: 0, perStatus: buatRekap().perStatus, perFacility: [] });
    render(<StaffMonthlyRecap recap={kosong} currentMonth="2026-02" warning={null} />);

    expect(screen.getByText(/Belum ada reservasi pada bulan ini/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("menampilkan tren 6 bulan sebagai tabel berlabel, periode, dan satuan", () => {
    render(<StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />);

    const tabel = screen.getByRole("table", { name: "Jumlah reservasi 6 bulan terakhir" });
    const baris = within(tabel).getAllByRole("row");
    // 1 baris kepala + 6 baris bulan.
    expect(baris).toHaveLength(7);
    expect(within(tabel).getByText("Agustus 2026")).toBeInTheDocument();
    expect(within(tabel).getByText("2026-08")).toBeInTheDocument();
    expect(within(tabel).getByText("4 reservasi")).toBeInTheDocument();
  });

  it("menampilkan metodologi di halaman", () => {
    render(<StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />);

    expect(screen.getByText(/Metodologi/)).toBeInTheDocument();
    expect(screen.getAllByText(/Asia\/Jakarta/).length).toBeGreaterThan(0);
    expect(screen.getByText(/tanggal pemakaian/i)).toBeInTheDocument();
  });

  it("lolos pemeriksaan aksesibilitas otomatis", async () => {
    const { container } = render(
      <StaffMonthlyRecap recap={buatRekap()} currentMonth="2026-09" warning={null} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
