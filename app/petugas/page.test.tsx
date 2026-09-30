import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requirePetugas } = vi.hoisted(() => ({ requirePetugas: vi.fn() }));
const { listStaffQueueService } = vi.hoisted(() => ({ listStaffQueueService: vi.fn() }));
const { getStaffReservationSummaryService } = vi.hoisted(() => ({
  getStaffReservationSummaryService: vi.fn(),
}));
const { getStaffMonthlyRecapService } = vi.hoisted(() => ({
  getStaffMonthlyRecapService: vi.fn(),
}));
const { parseStaffRecapMonth } = vi.hoisted(() => ({ parseStaffRecapMonth: vi.fn() }));

vi.mock("@/lib/auth", () => ({ requirePetugas }));
vi.mock("@/lib/services/reservation-service", () => ({ listStaffQueueService }));
vi.mock("@/lib/services/reservation-summary", () => ({ getStaffReservationSummaryService }));
vi.mock("@/lib/services/staff-monthly-recap", () => ({ getStaffMonthlyRecapService }));
vi.mock("@/lib/validation/staff-recap-month", () => ({ parseStaffRecapMonth }));
vi.mock("@/components/staff/dashboard", () => ({
  StaffDashboard: (props: Record<string, unknown>) => (
    <div data-testid="staff-dashboard">
      {JSON.stringify(props.ringkasan ?? null)}
      {JSON.stringify(props.rekap ?? null)}
      {JSON.stringify(props.rekapBulan ?? null)}
    </div>
  ),
}));

import PetugasDashboardPage from "@/app/petugas/page";

const REKAP = {
  month: "2026-09",
  monthLabel: "September 2026",
  total: 0,
  perStatus: [],
  perFacility: [],
  trend: [],
  methodology: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  parseStaffRecapMonth.mockReturnValue({ month: "2026-09", warning: null });
  getStaffMonthlyRecapService.mockResolvedValue(REKAP);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PetugasDashboardPage", () => {
  it("meneruskan redirect guard sebelum memanggil service (akses negatif)", async () => {
    requirePetugas.mockRejectedValue(new Error("redirect:/403"));

    await expect(PetugasDashboardPage({})).rejects.toThrow("redirect:/403");

    expect(requirePetugas).toHaveBeenCalledOnce();
    expect(listStaffQueueService).not.toHaveBeenCalled();
    expect(getStaffReservationSummaryService).not.toHaveBeenCalled();
    expect(getStaffMonthlyRecapService).not.toHaveBeenCalled();
  });

  it("memanggil guard petugas lalu memuat antrean dan ringkasan untuk peran petugas", async () => {
    requirePetugas.mockResolvedValue({ id: 7, nama: "Petugas", role: "petugas" });
    listStaffQueueService.mockResolvedValue({ data: { items: [], meta: { totalItems: 0 } } });
    getStaffReservationSummaryService.mockResolvedValue({
      menunggu: 1,
      disetujui: 2,
      sedangBerlangsung: 1,
      ditolak: 0,
      lainnya: 0,
      total: 3,
    });

    render(await PetugasDashboardPage({}));

    expect(requirePetugas).toHaveBeenCalledOnce();
    expect(listStaffQueueService).toHaveBeenCalledOnce();
    expect(getStaffReservationSummaryService).toHaveBeenCalledOnce();
    expect(screen.getByTestId("staff-dashboard")).toHaveTextContent('"menunggu":1');
    expect(screen.getByText(/"total":3/)).toBeInTheDocument();
  });

  it("meneruskan param bulan ke parser lalu memuat rekap bulan tersebut", async () => {
    requirePetugas.mockResolvedValue({ id: 7, nama: "Petugas", role: "petugas" });
    listStaffQueueService.mockResolvedValue({ data: { items: [], meta: { totalItems: 0 } } });
    getStaffReservationSummaryService.mockResolvedValue({
      menunggu: 0,
      disetujui: 0,
      sedangBerlangsung: 0,
      ditolak: 0,
      lainnya: 0,
      total: 0,
    });
    parseStaffRecapMonth.mockReturnValue({ month: "2026-08", warning: null });

    render(await PetugasDashboardPage({ searchParams: Promise.resolve({ bulan: "2026-08" }) }));

    expect(parseStaffRecapMonth).toHaveBeenCalledWith({ bulan: "2026-08" });
    expect(getStaffMonthlyRecapService).toHaveBeenCalledWith("2026-08");
    expect(screen.getByTestId("staff-dashboard")).toHaveTextContent('"2026-08"');
  });

  it("tetap menampilkan dashboard saat rekap gagal dimuat", async () => {
    requirePetugas.mockResolvedValue({ id: 7, nama: "Petugas", role: "petugas" });
    listStaffQueueService.mockResolvedValue({ data: { items: [], meta: { totalItems: 0 } } });
    getStaffReservationSummaryService.mockResolvedValue({
      menunggu: 0,
      disetujui: 0,
      sedangBerlangsung: 0,
      ditolak: 0,
      lainnya: 0,
      total: 0,
    });
    getStaffMonthlyRecapService.mockRejectedValue(new Error("basis data mati"));

    render(await PetugasDashboardPage({}));

    expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    expect(getStaffMonthlyRecapService).toHaveBeenCalledOnce();
  });
});
