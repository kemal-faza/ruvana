import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ALASAN_PERBAIKAN } from "@/lib/reservations/maintenance-listener";
import { asiaJakartaToUtc, calendarDateToUtcMidnight } from "@/lib/time/reservation-time";

// Database khusus tahap ini agar kepemilikan fixture jelas. Wajib loopback +
// database lokal, mengikuti pola reservation-approval/report-timestamps. Tanpa
// var ini seluruh suite di-skip (CI tanpa PostgreSQL tetap hijau).
const databaseUrl = process.env.FACILITY_STATUS_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set FACILITY_STATUS_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("FACILITY_STATUS_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("FACILITY_STATUS_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

const TANGGAL_MASA_DEPAN = "2027-06-15";
const TANGGAL_LAMPAU = "2026-01-10";
const WAKTU_PERUBAHAN = new Date("2026-10-01T03:00:00.000Z");
const WAKTU_KEMBALI = new Date("2026-10-02T03:00:00.000Z");

describe.skipIf(!databaseUrl)("integrasi PostgreSQL emitter status fasilitas (REP-04/RES-09)", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: typeof import("@/lib/prisma").prisma;
  let service: typeof import("@/lib/services/facility-status-service");

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    service = await import("@/lib/services/facility-status-service");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  interface Fixture {
    key: string;
    staffId: number;
    userId: number;
    facilityId: number;
    otherFacilityId: number;
    disetujuiMasaDepanId: number;
    disetujuiLampauId: number;
    menungguId: number;
    disetujuiFasilitasLainId: number;
    cleanup: () => Promise<void>;
  }

  async function siapkanFixture(): Promise<Fixture> {
    const key = randomUUID();
    const staff = await prisma.user.create({
      data: {
        nama: `Petugas uji status ${key}`,
        email: `status-staff-${key}@example.invalid`,
        password: "test-only",
        role: "petugas",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        nama: `Pengguna uji status ${key}`,
        email: `status-user-${key}@example.invalid`,
        password: "test-only",
        role: "pengguna",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const facility = await prisma.facility.create({
      data: {
        nama: `Fasilitas uji status ${key}`,
        tipe: "ruang_kelas",
        lokasi: "Uji integrasi status",
        kapasitas: 10,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const otherFacility = await prisma.facility.create({
      data: {
        nama: `Fasilitas uji status lain ${key}`,
        tipe: "aula",
        lokasi: "Uji integrasi status",
        kapasitas: 20,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    async function buatReservasi(
      facilityId: number,
      tanggal: string,
      mulai: string,
      selesai: string,
      status: "APPROVED" | "PENDING",
    ) {
      return prisma.reservation.create({
        data: {
          userId: user.id,
          facilityId,
          tanggal: calendarDateToUtcMidnight(tanggal),
          startTime: asiaJakartaToUtc(tanggal, mulai),
          endTime: asiaJakartaToUtc(tanggal, selesai),
          tujuanPenggunaan: `Fixture uji status ${key}`,
          status,
        },
        select: { id: true },
      });
    }

    const disetujuiMasaDepan = await buatReservasi(facility.id, TANGGAL_MASA_DEPAN, "10:00", "11:00", "APPROVED");
    const disetujuiLampau = await buatReservasi(facility.id, TANGGAL_LAMPAU, "10:00", "11:00", "APPROVED");
    const menunggu = await buatReservasi(facility.id, TANGGAL_MASA_DEPAN, "13:00", "14:00", "PENDING");
    const disetujuiFasilitasLain = await buatReservasi(otherFacility.id, TANGGAL_MASA_DEPAN, "10:00", "11:00", "APPROVED");

    return {
      key,
      staffId: staff.id,
      userId: user.id,
      facilityId: facility.id,
      otherFacilityId: otherFacility.id,
      disetujuiMasaDepanId: disetujuiMasaDepan.id,
      disetujuiLampauId: disetujuiLampau.id,
      menungguId: menunggu.id,
      disetujuiFasilitasLainId: disetujuiFasilitasLain.id,
      cleanup: async () => {
        await prisma.reservation.deleteMany({
          where: { facilityId: { in: [facility.id, otherFacility.id] } },
        });
        await prisma.facility.deleteMany({ where: { id: { in: [facility.id, otherFacility.id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [staff.id, user.id] } } });
      },
    };
  }

  it("menyimpan provenance dan membatalkan tepat reservasi APPROVED masa depan dalam satu transaksi", async () => {
    const f = await siapkanFixture();
    try {
      const hasil = await service.updateFacilityOperationalStatusService(
        f.staffId,
        f.facilityId,
        "UNDER_MAINTENANCE",
        WAKTU_PERUBAHAN,
      );

      expect(hasil.ok).toBe(true);
      if (!hasil.ok) return;
      expect(hasil.data.status).toBe("UNDER_MAINTENANCE");
      expect(hasil.data.statusChangedAt).toBe(WAKTU_PERUBAHAN.toISOString());
      expect(hasil.data.statusChangedBy).toEqual({
        id: f.staffId,
        nama: expect.stringContaining("Petugas uji status"),
        role: "petugas",
      });

      const fasilitas = await prisma.facility.findUnique({
        where: { id: f.facilityId },
        select: { status: true, statusChangedAt: true, statusChangedById: true },
      });
      expect(fasilitas?.status).toBe("UNDER_MAINTENANCE");
      expect(fasilitas?.statusChangedAt?.toISOString()).toBe(WAKTU_PERUBAHAN.toISOString());
      expect(fasilitas?.statusChangedById).toBe(f.staffId);

      const dibatalkan = await prisma.reservation.findUnique({
        where: { id: f.disetujuiMasaDepanId },
        select: { status: true, alasan: true, waktuDiproses: true },
      });
      expect(dibatalkan?.status).toBe("CANCELLED_BY_MAINTENANCE");
      expect(dibatalkan?.alasan).toBe(ALASAN_PERBAIKAN);
      expect(dibatalkan?.waktuDiproses?.toISOString()).toBe(WAKTU_PERUBAHAN.toISOString());

      const tidakBolehBerubah = await prisma.reservation.findMany({
        where: { id: { in: [f.disetujuiLampauId, f.menungguId, f.disetujuiFasilitasLainId] } },
        select: { id: true, status: true },
      });
      expect(tidakBolehBerubah).toEqual(
        expect.arrayContaining([
          { id: f.disetujuiLampauId, status: "APPROVED" },
          { id: f.menungguId, status: "PENDING" },
          { id: f.disetujuiFasilitasLainId, status: "APPROVED" },
        ]),
      );
    } finally {
      await f.cleanup();
    }
  });

  it("kembali ACTIVE memperbarui provenance tanpa membatalkan reservasi lain", async () => {
    const f = await siapkanFixture();
    try {
      const pergi = await service.updateFacilityOperationalStatusService(
        f.staffId,
        f.facilityId,
        "UNDER_MAINTENANCE",
        WAKTU_PERUBAHAN,
      );
      expect(pergi.ok).toBe(true);

      const pulang = await service.updateFacilityOperationalStatusService(
        f.staffId,
        f.facilityId,
        "ACTIVE",
        WAKTU_KEMBALI,
      );
      expect(pulang.ok).toBe(true);
      if (!pulang.ok) return;
      expect(pulang.data.status).toBe("ACTIVE");
      expect(pulang.data.statusChangedAt).toBe(WAKTU_KEMBALI.toISOString());

      const dibatalkan = await prisma.reservation.findUnique({
        where: { id: f.disetujuiMasaDepanId },
        select: { status: true },
      });
      expect(dibatalkan?.status).toBe("CANCELLED_BY_OFFICER");
      const menunggu = await prisma.reservation.findUnique({
        where: { id: f.menungguId },
        select: { status: true },
      });
      expect(menunggu?.status).toBe("PENDING");
    } finally {
      await f.cleanup();
    }
  });

  it("menolak INACTIVE dan status yang sama tanpa mengubah provenance", async () => {
    const f = await siapkanFixture();
    try {
      const tolak = await service.updateFacilityOperationalStatusService(
        f.staffId,
        f.facilityId,
        "INACTIVE" as never,
        WAKTU_PERUBAHAN,
      );
      expect(tolak.ok).toBe(false);
      if (!tolak.ok) expect(tolak.error.type).toBe("transition");

      const fasilitas = await prisma.facility.findUnique({
        where: { id: f.facilityId },
        select: { status: true, statusChangedAt: true, statusChangedById: true },
      });
      expect(fasilitas).toEqual({ status: "ACTIVE", statusChangedAt: null, statusChangedById: null });
    } finally {
      await f.cleanup();
    }
  });
});
