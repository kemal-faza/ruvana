import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.REPORTS_TIMESTAMP_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("Set REPORTS_TIMESTAMP_TEST_DATABASE_URL to run PostgreSQL integration coverage.");

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("REPORTS_TIMESTAMP_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("REPORTS_TIMESTAMP_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

describe.skipIf(!databaseUrl)("integrasi PostgreSQL rekap laporan", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let analytics: typeof import("@/lib/db/analytics");
  let prisma: typeof import("@/lib/prisma").prisma;

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    analytics = await import("@/lib/db/analytics");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  it("filters by Jakarta createdAt boundaries and the related facility location", async () => {
    const key = randomUUID();
    const start = new Date("2026-09-25T17:00:00.000Z");
    const endExclusive = new Date("2026-09-27T17:00:00.000Z");
    let userIds: number[] = [];
    let facilityIds: number[] = [];

    try {
      const users = await Promise.all(
        ["a", "b"].map((suffix) =>
          prisma.user.create({
            data: {
              nama: `Uji rekap ${key} ${suffix}`,
              email: `report-analytics-${key}-${suffix}@example.invalid`,
              password: "test-only",
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ),
      );
      userIds = users.map(({ id }) => id);

      const facilities = await Promise.all(
        ["Gedung Uji Rekap A", "Gedung Uji Rekap B"].map((nama, index) =>
          prisma.facility.create({
            data: {
              nama: `${nama} ${key}`,
              tipe: "ruang_kelas",
              lokasi: index === 0 ? "Lokasi Uji Rekap A" : "Lokasi Uji Rekap B",
              kapasitas: 10,
            },
            select: { id: true },
          }),
        ),
      );
      facilityIds = facilities.map(({ id }) => id);

      const records = [
        { createdAt: start, kategori: "Awal", status: "NEW" as const, facilityId: facilityIds[0]! },
        {
          createdAt: new Date("2026-09-27T16:59:59.999Z"),
          kategori: "Tengah",
          status: "IN_PROGRESS" as const,
          facilityId: facilityIds[0]!,
        },
        { createdAt: endExclusive, kategori: "Batas akhir", status: "RESOLVED" as const, facilityId: facilityIds[0]! },
        { createdAt: start, kategori: "Lokasi lain", status: "REJECTED" as const, facilityId: facilityIds[1]! },
      ];
      await Promise.all(
        records.map((record, index) =>
          prisma.report.create({
            data: {
              userId: userIds[index % userIds.length]!,
              facilityId: record.facilityId,
              kategori: record.kategori,
              deskripsi: `Fixture rekap ${index}`,
              status: record.status,
              createdAt: record.createdAt,
              updatedAt: record.createdAt,
            },
            select: { id: true },
          }),
        ),
      );

      const result = await analytics.getReportAnalyticsAggregates({
        startAt: start,
        endAtExclusive: endExclusive,
        location: "Lokasi Uji Rekap A",
      });

      expect(result.total).toBe(2);
      expect(result.byFacility).toEqual([{ facilityId: facilityIds[0], count: 2 }]);
      expect(result.byCategory).toEqual([
        { category: "Awal", count: 1 },
        { category: "Tengah", count: 1 },
      ]);
      expect(result.byStatus).toEqual([
        { status: "NEW", count: 1 },
        { status: "IN_PROGRESS", count: 1 },
      ]);
    } finally {
      if (facilityIds.length > 0) {
        await prisma.report.deleteMany({ where: { facilityId: { in: facilityIds } } });
        await prisma.facility.deleteMany({ where: { id: { in: facilityIds } } });
      }
      if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it("counts and groups more than 1,000 matching rows without source pagination", async () => {
    const key = randomUUID();
    const createdAt = new Date("2026-09-26T12:00:00.000Z");
    let userId: number | undefined;
    let facilityId: number | undefined;

    try {
      const user = await prisma.user.create({
        data: {
          nama: `Uji rekap besar ${key}`,
          email: `report-analytics-large-${key}@example.invalid`,
          password: "test-only",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      userId = user.id;
      const facility = await prisma.facility.create({
        data: {
          nama: `Fasilitas rekap besar ${key}`,
          tipe: "ruang_kelas",
          lokasi: "Lokasi Uji Rekap Besar",
          kapasitas: 10,
        },
        select: { id: true },
      });
      facilityId = facility.id;
      const reportUserId = user.id;
      const reportFacilityId = facility.id;

      await prisma.report.createMany({
        data: Array.from({ length: 1001 }, (_, index) => ({
          userId: reportUserId,
          facilityId: reportFacilityId,
          kategori: index % 2 === 0 ? "Kategori besar A" : "Kategori besar B",
          deskripsi: `Fixture rekap besar ${index}`,
          status: "NEW" as const,
          createdAt,
          updatedAt: createdAt,
        })),
      });

      const result = await analytics.getReportAnalyticsAggregates({
        startAt: new Date("2026-09-25T17:00:00.000Z"),
        endAtExclusive: new Date("2026-09-26T17:00:00.000Z"),
        location: "Lokasi Uji Rekap Besar",
      });

      expect(result.total).toBe(1001);
      expect(result.byFacility).toEqual([{ facilityId, count: 1001 }]);
      expect(result.byCategory.map(({ count }) => count)).toEqual([501, 500]);
      expect(result.byStatus).toEqual([{ status: "NEW", count: 1001 }]);
    } finally {
      if (facilityId !== undefined) {
        await prisma.report.deleteMany({ where: { facilityId } });
        await prisma.facility.delete({ where: { id: facilityId } });
      }
      if (userId !== undefined) await prisma.user.delete({ where: { id: userId } });
    }
  });
});
