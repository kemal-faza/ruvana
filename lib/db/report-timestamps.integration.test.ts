import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
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

describe.skipIf(!databaseUrl)("integrasi PostgreSQL timestamp laporan", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const connectionString = requireLoopbackDatabaseUrl(databaseUrl);
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("mempertahankan instant UTC saat konversi nilai TIMESTAMP lama", async () => {
    const migration = await readFile(
      resolve(process.cwd(), "prisma/migrations/20260925184755_report_timestamps_timestamptz/migration.sql"),
      "utf8",
    );
    const probeMigration = migration.replace(
      'ALTER TABLE "reports"',
      'ALTER TABLE "report_timestamp_migration_probe"',
    );
    expect(probeMigration).not.toBe(migration);

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SET LOCAL TIME ZONE 'Asia/Jakarta'`;
      await transaction.$executeRaw`
        CREATE TEMP TABLE report_timestamp_migration_probe (
          "createdAt" TIMESTAMP(3) NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL
        ) ON COMMIT DROP
      `;
      await transaction.$executeRaw`
        INSERT INTO report_timestamp_migration_probe ("createdAt", "updatedAt")
        VALUES (
          TIMESTAMP '2026-09-25 17:00:00.000',
          TIMESTAMP '2026-09-25 18:00:00.000'
        )
      `;
      await transaction.$executeRawUnsafe(probeMigration);

      const instants = await transaction.$queryRaw<Array<{ createdAtUtc: string; updatedAtUtc: string }>>`
        SELECT
          to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS') AS "createdAtUtc",
          to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS') AS "updatedAtUtc"
        FROM report_timestamp_migration_probe
      `;

      expect(instants).toEqual([
        { createdAtUtc: "2026-09-25 17:00:00.000", updatedAtUtc: "2026-09-25 18:00:00.000" },
      ]);
    });
  });

  it("menyimpan CRUD laporan sebagai instant dan menerapkan rentang hari Jakarta [awal, akhir)", async () => {
    const columns = await prisma.$queryRaw<Array<{ columnName: string; dataType: string }>>`
      SELECT column_name AS "columnName", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reports'
        AND column_name IN ('createdAt', 'updatedAt')
      ORDER BY column_name
    `;

    expect(columns).toEqual([
      { columnName: "createdAt", dataType: "timestamp with time zone" },
      { columnName: "updatedAt", dataType: "timestamp with time zone" },
    ]);

    const key = randomUUID();
    let user: { id: number } | undefined;
    let facility: { id: number } | undefined;

    try {
      user = await prisma.user.create({
        data: {
          nama: `Uji timestamp ${key}`,
          email: `report-timestamp-${key}@example.invalid`,
          password: "test-only",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      facility = await prisma.facility.create({
        data: {
          nama: `Fasilitas uji timestamp ${key}`,
          tipe: "ruang_kelas",
          lokasi: "Uji integrasi",
          kapasitas: 1,
        },
        select: { id: true },
      });
      const userId = user.id;
      const facilityId = facility.id;

      const start = new Date("2026-09-25T17:00:00.000Z");
      const beforeNextDay = new Date("2026-09-26T16:59:59.999Z");
      const nextDayStart = new Date("2026-09-26T17:00:00.000Z");
      const instants = [start, beforeNextDay, nextDayStart];
      const reports = await Promise.all(
        instants.map((instant, index) =>
          prisma.report.create({
            data: {
              userId,
              facilityId,
              kategori: "Uji timestamp",
              deskripsi: `Fixture batas ${index}`,
              createdAt: instant,
              updatedAt: instant,
            },
            select: { id: true, createdAt: true, updatedAt: true },
          }),
        ),
      );

      const inRange = await prisma.report.findMany({
        where: { facilityId, createdAt: { gte: start, lt: nextDayStart } },
        orderBy: { createdAt: "asc" },
        select: { id: true, createdAt: true },
      });

      expect(inRange.map(({ id }) => id)).toEqual([reports[0].id, reports[1].id]);
      expect(inRange.map(({ createdAt }) => createdAt.toISOString())).toEqual([
        start.toISOString(),
        beforeNextDay.toISOString(),
      ]);

      const updated = await prisma.report.update({
        where: { id: reports[0].id },
        data: { status: "IN_PROGRESS", deskripsi: "Diperbarui setelah migration" },
        select: { id: true, status: true, createdAt: true, updatedAt: true },
      });
      const reread = await prisma.report.findUnique({
        where: { id: updated.id },
        select: { id: true, status: true, createdAt: true, updatedAt: true },
      });

      expect(updated.status).toBe("IN_PROGRESS");
      expect(updated.createdAt.toISOString()).toBe(start.toISOString());
      expect(updated.updatedAt.getTime()).toBeGreaterThan(start.getTime());
      expect(reread).toEqual(updated);
    } finally {
      if (facility) {
        await prisma.report.deleteMany({ where: { facilityId: facility.id } });
        await prisma.facility.delete({ where: { id: facility.id } });
      }
      if (user) await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
