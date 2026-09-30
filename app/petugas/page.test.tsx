import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requirePetugas } = vi.hoisted(() => ({ requirePetugas: vi.fn() }));
const { listStaffQueueService } = vi.hoisted(() => ({ listStaffQueueService: vi.fn() }));
const { getStaffReservationSummaryService } = vi.hoisted(() => ({
  getStaffReservationSummaryService: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePetugas }));
vi.mock("@/lib/services/reservation-service", () => ({ listStaffQueueService }));
vi.mock("@/lib/services/reservation-summary", () => ({ getStaffReservationSummaryService }));
vi.mock("@/components/staff/dashboard", () => ({
  StaffDashboard: (props: Record<string, unknown>) => (
    <div data-testid="staff-dashboard">{JSON.stringify(props.ringkasan ?? null)}</div>
  ),
}));

import PetugasDashboardPage from "@/app/petugas/page";

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PetugasDashboardPage", () => {
  it("meneruskan redirect guard sebelum memanggil service (akses negatif)", async () => {
    requirePetugas.mockRejectedValue(new Error("redirect:/403"));

    await expect(PetugasDashboardPage()).rejects.toThrow("redirect:/403");

    expect(requirePetugas).toHaveBeenCalledOnce();
    expect(listStaffQueueService).not.toHaveBeenCalled();
    expect(getStaffReservationSummaryService).not.toHaveBeenCalled();
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

    render(await PetugasDashboardPage());

    expect(requirePetugas).toHaveBeenCalledOnce();
    expect(listStaffQueueService).toHaveBeenCalledOnce();
    expect(getStaffReservationSummaryService).toHaveBeenCalledOnce();
    expect(screen.getByTestId("staff-dashboard")).toHaveTextContent('"menunggu":1');
    expect(screen.getByText(/"total":3/)).toBeInTheDocument();
  });
});
