import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asiaJakartaToUtc, calendarDateToUtcMidnight } from "@/lib/time/reservation-time";

// Database khusus tahap ini agar fixture ringkasan terisolasi. Mengikuti pola
// reservation-approval: tanpa var ini seluruh suite di-skip (CI tanpa
// PostgreSQL tetap hijau). Wajib loopback + database lokal.
const databaseUrl = process.env.RESERVATION_SUMMARY_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set RESERVATION_SUMMARY_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("RESERVATION_SUMMARY_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("RESERVATION_SUMMARY_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

// Tanggal jauh di masa depan (minimal 48 jam dari sekarang): imun aturan
// pengajuan H-1 Tahap 7 dan aturan H-24 pembatalan.
const TANGGAL = "2027-06-15";

describe.skipIf(!databaseUrl)("integrasi PostgreSQL ringkasan reservasi petugas", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: typeof import("@/lib/prisma").prisma;
  let service: typeof import("@/lib/services/reservation-summary");

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    service = await import("@/lib/services/reservation-summary");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  it("total kelompok sama dengan jumlah seluruh reservasi", async () => {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: {
        nama: `Pengguna uji ringkasan ${key}`,
        email: `ringkasan-${key}@example.invalid`,
        password: "test-only",
        role: "pengguna",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const facility = await prisma.facility.create({
      data: {
        nama: `Ruang uji ringkasan ${key}`,
        tipe: "ruang_kelas",
        lokasi: "Gedung Uji",
        kapasitas: 10,
      },
      select: { id: true },
    });
    const tanggal = calendarDateToUtcMidnight(TANGGAL);
    const statusList = [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_OFFICER",
      "EXPIRED",
    ] as const;

    try {
      let jam = 7;
      for (const status of statusList) {
        const mulai = `${String(jam).padStart(2, "0")}:00`;
        const selesai = `${String(jam).padStart(2, "0")}:30`;
        await prisma.reservation.create({
          data: {
            userId: user.id,
            facilityId: facility.id,
            tanggal,
            startTime: asiaJakartaToUtc(TANGGAL, mulai),
            endTime: asiaJakartaToUtc(TANGGAL, selesai),
            tujuanPenggunaan: `Keperluan uji ${status} ${key}`,
            status,
          },
        });
        jam += 1;
      }

      const ringkasan = await service.getStaffReservationSummaryService();
      const totalLangsung = await prisma.reservation.count({
        where: { userId: user.id },
      });

      expect(totalLangsung).toBe(statusList.length);
      expect(ringkasan.menunggu).toBeGreaterThanOrEqual(1);
      expect(ringkasan.disetujui).toBeGreaterThanOrEqual(1);
      expect(ringkasan.ditolak).toBeGreaterThanOrEqual(1);
      expect(ringkasan.lainnya).toBeGreaterThanOrEqual(3);
      expect(ringkasan.total).toBe(
        ringkasan.menunggu + ringkasan.disetujui + ringkasan.ditolak + ringkasan.lainnya,
      );
    } finally {
      await prisma.reservation.deleteMany({ where: { userId: user.id } });
      await prisma.facility.delete({ where: { id: facility.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
