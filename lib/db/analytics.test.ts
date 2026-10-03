import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyFacilities, queryRaw, reportCount, reportGroupBy } = vi.hoisted(() => ({
  findManyFacilities: vi.fn(),
  queryRaw: vi.fn(),
  reportCount: vi.fn(),
  reportGroupBy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: { findMany: findManyFacilities },
    report: { count: reportCount, groupBy: reportGroupBy },
    $queryRaw: queryRaw,
  },
}));

import {
  getReportAnalyticsAggregates,
  listAnalyticsFacilities,
  sumApprovedReservationMinutes,
} from "@/lib/db/analytics";

beforeEach(() => vi.clearAllMocks());

describe("analytics data access", () => {
  it("loads current facilities with every database status available", async () => {
    findManyFacilities.mockResolvedValue([]);

    await listAnalyticsFacilities();

    expect(findManyFacilities).toHaveBeenCalledWith({
      select: { id: true, nama: true, lokasi: true, status: true },
    });
  });

  it("sums approved minutes in SQL using inclusive campus calendar DATE boundaries", async () => {
    queryRaw.mockResolvedValue([{ totalMinutes: 120 }]);

    const minutes = await sumApprovedReservationMinutes({
      facilityIds: [4, 9],
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    });

    expect(minutes).toBe(120);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const [queryStrings, facilityIds, boundStatus, boundStartDate, boundEndDate] = queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      { values: number[] },
      string,
      string,
      string,
    ];
    const querySkeleton = Array.from(queryStrings).join("?");
    expect(querySkeleton).toContain('FROM "reservations"');
    expect(querySkeleton).toContain('SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60)');
    expect(querySkeleton).toContain('"status" = ?');
    expect(querySkeleton).toContain('"tanggal" >= ?::date');
    expect(querySkeleton).toContain('"tanggal" <= ?::date');
    expect(facilityIds.values).toEqual([4, 9]);
    expect(boundStatus).toBe("APPROVED");
    expect([boundStartDate, boundEndDate]).toEqual(["2026-09-01", "2026-09-03"]);
  });

  it("returns zero for an empty facility selection without issuing SQL", async () => {
    await expect(
      sumApprovedReservationMinutes({ facilityIds: [], startDate: "2026-09-01", endDate: "2026-09-03" }),
    ).resolves.toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("aggregates report totals and every breakdown using the UTC half-open range and related location", async () => {
    const startAt = new Date("2026-08-31T17:00:00.000Z");
    const endAtExclusive = new Date("2026-09-02T17:00:00.000Z");
    reportCount.mockResolvedValue(8);
    reportGroupBy
      .mockResolvedValueOnce([{ facilityId: 4, _count: { _all: 5 } }])
      .mockResolvedValueOnce([{ kategori: "Peralatan", _count: { _all: 8 } }])
      .mockResolvedValueOnce([{ status: "NEW", _count: { _all: 8 } }]);

    await expect(
      getReportAnalyticsAggregates({ startAt, endAtExclusive, location: "Gedung A" }),
    ).resolves.toEqual({
      total: 8,
      byFacility: [{ facilityId: 4, count: 5 }],
      byCategory: [{ category: "Peralatan", count: 8 }],
      byStatus: [{ status: "NEW", count: 8 }],
    });

    const where = {
      createdAt: { gte: startAt, lt: endAtExclusive },
      facility: { is: { lokasi: "Gedung A" } },
    };
    expect(reportCount).toHaveBeenCalledWith({ where });
    expect(reportGroupBy).toHaveBeenNthCalledWith(1, {
      by: ["facilityId"],
      where,
      _count: { _all: true },
    });
    expect(reportGroupBy).toHaveBeenNthCalledWith(2, {
      by: ["kategori"],
      where,
      _count: { _all: true },
    });
    expect(reportGroupBy).toHaveBeenNthCalledWith(3, {
      by: ["status"],
      where,
      _count: { _all: true },
    });
  });

  it("leaves the facility relation filter out when all locations are selected", async () => {
    reportCount.mockResolvedValue(0);
    reportGroupBy.mockResolvedValue([]);

    await expect(
      getReportAnalyticsAggregates({
        startAt: new Date("2026-09-01T00:00:00.000Z"),
        endAtExclusive: new Date("2026-09-02T00:00:00.000Z"),
        location: null,
      }),
    ).resolves.toEqual({ total: 0, byFacility: [], byCategory: [], byStatus: [] });

    expect(reportCount).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date("2026-09-01T00:00:00.000Z"),
          lt: new Date("2026-09-02T00:00:00.000Z"),
        },
      },
    });
  });

  it("returns the full database aggregate count above 1,000 without paginating source rows", async () => {
    reportCount.mockResolvedValue(1001);
    reportGroupBy
      .mockResolvedValueOnce([{ facilityId: 4, _count: { _all: 1001 } }])
      .mockResolvedValueOnce([{ kategori: "Lainnya", _count: { _all: 1001 } }])
      .mockResolvedValueOnce([{ status: "NEW", _count: { _all: 1001 } }]);

    const result = await getReportAnalyticsAggregates({
      startAt: new Date("2026-09-01T00:00:00.000Z"),
      endAtExclusive: new Date("2026-09-02T00:00:00.000Z"),
      location: null,
    });

    expect(result.total).toBe(1001);
    expect(result.byFacility[0]).toEqual({ facilityId: 4, count: 1001 });
    expect(reportGroupBy).toHaveBeenCalledTimes(3);
  });
});
