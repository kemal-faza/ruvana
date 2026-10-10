import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  asiaJakartaToUtc,
  calendarDateToUtcMidnight,
} from "@/lib/time/reservation-time";

// Database khusus tahap ini agar fixture rekap terisolasi. Mengikuti pola
// reservation-summary: tanpa var ini seluruh suite di-skip (CI tanpa
// PostgreSQL tetap hijau). Wajib loopback + database lokal.
const databaseUrl = process.env.STAFF_RECAP_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set STAFF_RECAP_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("STAFF_RECAP_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("STAFF_RECAP_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

// Tanggal tetap jauh di masa depan: tidak dipengaruhi batas pengajuan H-14
// maupun batas pembatalan H-24.
const AKHIR_SEPTEMBER = "2027-09-30";
const AWAL_OKTOBER = "2027-10-01";
const AKHIR_DESEMBER = "2027-12-31";
const AWAL_JANUARI = "2028-01-01";

describe.skipIf(!databaseUrl)("integrasi PostgreSQL rekap bulanan petugas", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: typeof import("@/lib/prisma").prisma;
  let service: typeof import("@/lib/services/staff-monthly-recap");

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    service = await import("@/lib/services/staff-monthly-recap");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  it("mengelompokkan tanggal 30 ke bulannya dan 1 ke bulan berikutnya", async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: {
        nama: `Pengguna uji rekap ${key}`,
        email: `rekap-${key}@example.invalid`,
        password: "test-only",
        role: "pengguna",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const facility = await prisma.facility.create({
      data: {
        nama: `Ruang uji rekap ${key}`,
        tipe: "ruang_kelas",
        lokasi: "Gedung Uji",
        kapasitas: 10,
      },
      select: { id: true, nama: true },
    });

    try {
      const sebelumSeptember = await service.getStaffMonthlyRecapService("2027-09");
      const sebelumOktober = await service.getStaffMonthlyRecapService("2027-10");

      for (const [tanggal, mulai, selesai] of [
        [AKHIR_SEPTEMBER, "09:00", "09:30"],
        [AWAL_OKTOBER, "10:00", "10:30"],
      ] as const) {
        await prisma.reservation.create({
          data: {
            userId: user.id,
            facilityId: facility.id,
            tanggal: calendarDateToUtcMidnight(tanggal),
            startTime: asiaJakartaToUtc(tanggal, mulai),
            endTime: asiaJakartaToUtc(tanggal, selesai),
            tujuanPenggunaan: `Keperluan uji batas bulan ${key}`,
            status: "APPROVED",
          },
        });
      }

      const september = await service.getStaffMonthlyRecapService("2027-09");
      const oktober = await service.getStaffMonthlyRecapService("2027-10");

      expect(september.total - sebelumSeptember.total).toBe(1);
      expect(oktober.total - sebelumOktober.total).toBe(1);
      const fasilitasSeptember = september.perFacility.find(
        (item) => item.facilityId === facility.id,
      );
      expect(fasilitasSeptember?.count).toBe(
        (sebelumSeptember.perFacility.find((item) => item.facilityId === facility.id)?.count ?? 0) + 1,
      );
    } finally {
      await prisma.reservation.deleteMany({ where: { userId: user.id } });
      await prisma.facility.delete({ where: { id: facility.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("menghitung tren 6 bulan melewati pergantian tahun", async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: {
        nama: `Pengguna uji tren ${key}`,
        email: `tren-${key}@example.invalid`,
        password: "test-only",
        role: "pengguna",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const facility = await prisma.facility.create({
      data: {
        nama: `Ruang uji tren ${key}`,
        tipe: "aula",
        lokasi: "Gedung Uji",
        kapasitas: 20,
      },
      select: { id: true },
    });

    try {
      const sebelum = await service.getStaffMonthlyRecapService("2028-01");
      const jumlahSebelum = new Map(sebelum.trend.map((item) => [item.month, item.count]));

      for (const tanggal of [AKHIR_DESEMBER, AWAL_JANUARI] as const) {
        await prisma.reservation.create({
          data: {
            userId: user.id,
            facilityId: facility.id,
            tanggal: calendarDateToUtcMidnight(tanggal),
            startTime: asiaJakartaToUtc(tanggal, "09:00"),
            endTime: asiaJakartaToUtc(tanggal, "09:30"),
            tujuanPenggunaan: `Keperluan uji tren ${key}`,
            status: "PENDING",
          },
        });
      }

      const rekap = await service.getStaffMonthlyRecapService("2028-01");

      expect(rekap.trend.map((item) => item.month)).toEqual([
        "2027-08",
        "2027-09",
        "2027-10",
        "2027-11",
        "2027-12",
        "2028-01",
      ]);
      const jumlah = new Map(rekap.trend.map((item) => [item.month, item.count]));
      expect((jumlah.get("2027-12") ?? 0) - (jumlahSebelum.get("2027-12") ?? 0)).toBe(1);
      expect((jumlah.get("2028-01") ?? 0) - (jumlahSebelum.get("2028-01") ?? 0)).toBe(1);
    } finally {
      await prisma.reservation.deleteMany({ where: { userId: user.id } });
      await prisma.facility.delete({ where: { id: facility.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
