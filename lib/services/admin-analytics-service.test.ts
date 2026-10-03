import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAnalyticsFacilities, sumApprovedReservationMinutes, getReportAnalyticsAggregates } = vi.hoisted(() => ({
  listAnalyticsFacilities: vi.fn(),
  sumApprovedReservationMinutes: vi.fn(),
  getReportAnalyticsAggregates: vi.fn(),
}));

vi.mock("@/lib/db/analytics", () => ({
  listAnalyticsFacilities,
  sumApprovedReservationMinutes,
  getReportAnalyticsAggregates,
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
  getReportAnalyticsAggregates.mockResolvedValue({
    total: 0,
    byFacility: [],
    byCategory: [],
    byStatus: [],
  });
});

describe("getAnalyticsSnapshot", () => {
  it("returns sorted unique locations for filter options", async () => {
    expect(await getAnalyticsLocations()).toEqual(["Kampus A", "Kampus B"]);
  });

  it("uses all facility states in period capacity and sums only APPROVED minutes", async () => {
    const result = await getAnalyticsSnapshot(filters);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.metadata.generatedAt).toBeInstanceOf(Date);
    expect(result.data.methodology.occupancyFormula).toContain("reservasi disetujui");
    expect(result.data.methodology.approvedStatusRule).toContain("berstatus disetujui");
    expect(result.data.methodology.approvedStatusRule).not.toContain("APPROVED");
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
    expect(getReportAnalyticsAggregates).toHaveBeenCalledWith({
      startAt: new Date("2026-08-31T17:00:00.000Z"),
      endAtExclusive: new Date("2026-09-02T17:00:00.000Z"),
      location: null,
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
    expect(getReportAnalyticsAggregates).toHaveBeenCalledWith({
      startAt: new Date("2026-08-31T17:00:00.000Z"),
      endAtExclusive: new Date("2026-09-01T17:00:00.000Z"),
      location: "Kampus A",
    });
  });

  it("returns zero percent for a valid period with positive capacity and no approved minutes", async () => {
    sumApprovedReservationMinutes.mockResolvedValue(0);

    const result = await getAnalyticsSnapshot(filters);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.occupancy).toMatchObject({
      facilityCount: 3,
      capacityMinutes: 3 * 2 * 780,
      totalApprovedMinutes: 0,
      occupancyPercent: 0,
      unavailableReason: null,
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
    expect(getReportAnalyticsAggregates).not.toHaveBeenCalled();
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
    expect(result.data.reports).toEqual({ total: 0, byFacility: [], byCategory: [], byStatus: [] });
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

  it("returns independently aggregated report groupings sorted by count and Indonesian label", async () => {
    getReportAnalyticsAggregates.mockResolvedValue({
      total: 9,
      byFacility: [
        { facilityId: 1, count: 2 },
        { facilityId: 2, count: 5 },
        { facilityId: 3, count: 2 },
      ],
      byCategory: [
        { category: "Peralatan", count: 3 },
        { category: "Listrik", count: 3 },
        { category: "Lainnya", count: 3 },
      ],
      byStatus: [
        { status: "RESOLVED", count: 2 },
        { status: "NEW", count: 3 },
        { status: "IN_PROGRESS", count: 2 },
        { status: "REJECTED", count: 2 },
      ],
    });

    const result = await getAnalyticsSnapshot(filters);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reports).toEqual({
      total: 9,
      byFacility: [
        { facilityId: 2, label: "Aula Zeta", count: 5 },
        { facilityId: 3, label: "Laboratorium", count: 2 },
        { facilityId: 1, label: "Ruang Alfa", count: 2 },
      ],
      byCategory: [
        { label: "Lainnya", count: 3 },
        { label: "Listrik", count: 3 },
        { label: "Peralatan", count: 3 },
      ],
      byStatus: [
        { status: "NEW", label: "Baru", count: 3 },
        { status: "IN_PROGRESS", label: "Diproses", count: 2 },
        { status: "REJECTED", label: "Ditolak", count: 2 },
        { status: "RESOLVED", label: "Selesai", count: 2 },
      ],
    });
    expect(result.data.methodology.reportCreationDateRule).toMatch(/waktu dibuat/i);
  });

  it("keeps report counts independent from occupancy and current facility status date semantics", async () => {
    getReportAnalyticsAggregates.mockResolvedValue({
      total: 4,
      byFacility: [{ facilityId: 1, count: 4 }],
      byCategory: [{ category: "Listrik", count: 4 }],
      byStatus: [{ status: "NEW", count: 4 }],
    });
    const first = await getAnalyticsSnapshot(filters);
    getReportAnalyticsAggregates.mockResolvedValueOnce({
      total: 2,
      byFacility: [{ facilityId: 1, count: 2 }],
      byCategory: [{ category: "Listrik", count: 2 }],
      byStatus: [{ status: "NEW", count: 2 }],
    });
    const second = await getAnalyticsSnapshot({ ...filters, startDate: "2030-01-01", endDate: "2030-01-01" });

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data.reports.total).toBe(4);
      expect(second.data.reports.total).toBe(2);
      expect(second.data.facilityStatuses).toEqual(first.data.facilityStatuses);
    }
  });
});
