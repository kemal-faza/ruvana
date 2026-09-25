import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAnalyticsFacilities, sumApprovedReservationMinutes } = vi.hoisted(() => ({
  listAnalyticsFacilities: vi.fn(),
  sumApprovedReservationMinutes: vi.fn(),
}));

vi.mock("@/lib/db/analytics", () => ({
  listAnalyticsFacilities,
  sumApprovedReservationMinutes,
}));

import { getAnalyticsLocations, getAnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const filters = {
  startDate: "2026-09-01",
  endDate: "2026-09-02",
  location: null,
};

const facilities = [
  { id: 1, nama: "Ruang Alfa", lokasi: "Kampus A", status: "ACTIVE" as const },
  { id: 2, nama: "Aula Zeta", lokasi: "Kampus A", status: "UNDER_MAINTENANCE" as const },
  { id: 3, nama: "Laboratorium", lokasi: "Kampus B", status: "INACTIVE" as const },
];

beforeEach(() => {
  vi.clearAllMocks();
  listAnalyticsFacilities.mockResolvedValue(facilities);
  sumApprovedReservationMinutes.mockResolvedValue(120);
});

describe("getAnalyticsSnapshot", () => {
  it("returns sorted unique locations for filter options", async () => {
    expect(await getAnalyticsLocations()).toEqual(["Kampus A", "Kampus B"]);
  });

  it("uses all facility states in period capacity and sums only APPROVED minutes", async () => {
    const result = await getAnalyticsSnapshot(filters);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.occupancy).toEqual({
      facilityCount: 3,
      dayCount: 2,
      totalApprovedMinutes: 120,
      capacityMinutes: 3 * 2 * 780,
      occupancyPercent: (120 / (3 * 2 * 780)) * 100,
      unavailableReason: null,
    });
    expect(sumApprovedReservationMinutes).toHaveBeenCalledWith({
      facilityIds: [2, 3, 1],
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    });
  });

  it("filters both the occupancy denominator and current status list by location", async () => {
    const result = await getAnalyticsSnapshot({ ...filters, location: "Kampus A", endDate: "2026-09-01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.occupancy.facilityCount).toBe(2);
    expect(result.data.occupancy.capacityMinutes).toBe(2 * 780);
    expect(result.data.facilityStatuses).toEqual({
      ACTIVE: ["Ruang Alfa"],
      UNDER_MAINTENANCE: ["Aula Zeta"],
      INACTIVE: [],
    });
    expect(sumApprovedReservationMinutes).toHaveBeenCalledWith({
      facilityIds: [2, 1],
      startDate: "2026-09-01",
      endDate: "2026-09-01",
    });
  });

  it("rejects an unknown location without querying reservation data", async () => {
    const result = await getAnalyticsSnapshot({ ...filters, location: "Tidak ada" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toEqual(
        expect.objectContaining({ field: "location", code: "UNKNOWN_LOCATION" }),
      );
      expect(result.locations).toEqual(["Kampus A", "Kampus B"]);
    }
    expect(sumApprovedReservationMinutes).not.toHaveBeenCalled();
  });

  it("reports zero capacity as not computable and does not query reservations", async () => {
    listAnalyticsFacilities.mockResolvedValue([]);

    const result = await getAnalyticsSnapshot(filters);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.occupancy).toMatchObject({
      facilityCount: 0,
      capacityMinutes: 0,
      occupancyPercent: null,
      unavailableReason: expect.stringMatching(/tidak ada fasilitas/i),
    });
    expect(result.data.facilityStatuses).toEqual({ ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] });
    expect(sumApprovedReservationMinutes).not.toHaveBeenCalled();
  });

  it("keeps the current-status snapshot independent of the selected date range", async () => {
    const first = await getAnalyticsSnapshot(filters);
    const second = await getAnalyticsSnapshot({ ...filters, startDate: "2030-01-01", endDate: "2030-01-01" });

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.data.facilityStatuses).toEqual(first.data.facilityStatuses);
      expect(second.data.occupancy.dayCount).not.toBe(first.data.occupancy.dayCount);
    }
  });
});
