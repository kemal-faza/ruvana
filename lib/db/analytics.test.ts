import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyFacilities, queryRaw } = vi.hoisted(() => ({
  findManyFacilities: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: { findMany: findManyFacilities },
    $queryRaw: queryRaw,
  },
}));

import { listAnalyticsFacilities, sumApprovedReservationMinutes } from "@/lib/db/analytics";

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
});
