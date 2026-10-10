import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  asiaJakartaToUtc,
  calendarDateToUtcMidnight,
} from "@/lib/time/reservation-time";

// Database khusus tahap ini (terpisah dari var laporan) agar kepemilikan
// fixture jelas. Wajib loopback + database lokal, mengikuti pola
// report-timestamps/report-analytics. Tanpa var ini seluruh suite di-skip
// (CI tanpa PostgreSQL tetap hijau).
const databaseUrl = process.env.RESERVATION_APPROVAL_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set RESERVATION_APPROVAL_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("RESERVATION_APPROVAL_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("RESERVATION_APPROVAL_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

// Tanggal tetap jauh di masa depan: imun aturan pengajuan H-14 dan H-24,
// deterministik, zona Asia/Jakarta.
// `now` eksplisit untuk service: slot selalu di masa depan relatif ke instant ini.
const TANGGAL = "2027-06-15";
const SEKARANG = new Date("2026-10-01T00:00:00.000Z");

describe.skipIf(!databaseUrl)("integrasi PostgreSQL overlap dan konkurensi persetujuan", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: typeof import("@/lib/prisma").prisma;
  let service: typeof import("@/lib/services/reservation-service");
  let db: typeof import("@/lib/db/reservations");

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    service = await import("@/lib/services/reservation-service");
    db = await import("@/lib/db/reservations");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  interface Fixture {
    key: string;
    staffId: number;
    userIds: number[];
    facilityId: number;
    cleanup: () => Promise<void>;
  }

  async function siapkanFixture(): Promise<Fixture> {
    const key = randomUUID();
    const staff = await prisma.user.create({
      data: {
        nama: `Petugas uji approval ${key}`,
        email: `approval-staff-${key}@example.invalid`,
        password: "test-only",
        role: "petugas",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const users = await Promise.all(
      ["a", "b"].map((suffix) =>
        prisma.user.create({
          data: {
            nama: `Pengguna uji approval ${key} ${suffix}`,
            email: `approval-user-${key}-${suffix}@example.invalid`,
            password: "test-only",
            role: "pengguna",
            status: "ACTIVE",
          },
          select: { id: true },
        }),
      ),
    );
    const facility = await prisma.facility.create({
      data: {
        nama: `Fasilitas uji approval ${key}`,
        tipe: "ruang_kelas",
        lokasi: "Uji integrasi approval",
        kapasitas: 10,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    return {
      key,
      staffId: staff.id,
      userIds,
      facilityId: facility.id,
      cleanup: async () => {
        await prisma.reservation.deleteMany({ where: { facilityId: facility.id } });
        await prisma.facility.delete({ where: { id: facility.id } });
        await prisma.user.deleteMany({ where: { id: { in: [staff.id, ...userIds] } } });
      },
    };
  }

  async function buatPending(
    fixture: Fixture,
    pemohonIndex: 0 | 1,
    mulai: string,
    selesai: string,
    createdAt: Date,
  ) {
    return prisma.reservation.create({
      data: {
        userId: fixture.userIds[pemohonIndex]!,
        facilityId: fixture.facilityId,
        tanggal: calendarDateToUtcMidnight(TANGGAL),
        startTime: asiaJakartaToUtc(TANGGAL, mulai),
        endTime: asiaJakartaToUtc(TANGGAL, selesai),
        tujuanPenggunaan: `Fixture uji approval ${fixture.key}`,
        status: "PENDING",
        createdAt,
      },
      select: { id: true, status: true },
    });
  }

  it("PENDING boleh overlap; hanya APPROVED yang memblokir slot", async () => {
    const f = await siapkanFixture();
    try {
      const hasilA = await service.createReservationService(
        f.userIds[0]!,
        { facilityId: f.facilityId, date: TANGGAL, startTime: "10:00", endTime: "11:00", tujuanPenggunaan: "Acuan A" },
        SEKARANG,
      );
      const hasilB = await service.createReservationService(
        f.userIds[1]!,
        { facilityId: f.facilityId, date: TANGGAL, startTime: "10:30", endTime: "12:00", tujuanPenggunaan: "Acuan B" },
        SEKARANG,
      );
      expect(hasilA.ok).toBe(true);
      expect(hasilB.ok).toBe(true);

      const bertabrakan = await prisma.$transaction((tx) =>
        db.findOverlappingApproved(tx, {
          facilityId: f.facilityId,
          startsAt: asiaJakartaToUtc(TANGGAL, "10:30"),
          endsAt: asiaJakartaToUtc(TANGGAL, "12:00"),
        }),
      );
      expect(bertabrakan).toEqual([]);
    } finally {
      await f.cleanup();
    }
  });

  it("antrean terurut waktu pengajuan menaik lalu id menaik (A sebelum B)", async () => {
    const f = await siapkanFixture();
    try {
      const dibuatA = new Date(SEKARANG.getTime());
      const dibuatB = new Date(SEKARANG.getTime() + 60_000);
      const a = await buatPending(f, 0, "10:00", "11:00", dibuatA);
      const b = await buatPending(f, 1, "10:30", "12:00", dibuatB);

      const antrean = await service.listStaffQueueService({ page: 1, perPage: 50 });
      const posisiA = antrean.data.items.findIndex((item) => item.id === a.id);
      const posisiB = antrean.data.items.findIndex((item) => item.id === b.id);
      expect(posisiA).toBeGreaterThanOrEqual(0);
      expect(posisiB).toBeGreaterThanOrEqual(0);
      expect(posisiA).toBeLessThan(posisiB);
    } finally {
      await f.cleanup();
    }
  });

  it("approve B sesudah A gagal konflik dengan slot terbaru; B tetap PENDING dan bisa ditolak", async () => {
    const f = await siapkanFixture();
    try {
      const a = await buatPending(f, 0, "10:00", "11:00", SEKARANG);
      const b = await buatPending(f, 1, "10:30", "12:00", new Date(SEKARANG.getTime() + 60_000));

      const setujuA = await service.approveReservationService(f.staffId, a.id, SEKARANG);
      expect(setujuA.ok).toBe(true);

      const setujuB = await service.approveReservationService(f.staffId, b.id, SEKARANG);
      expect(setujuB.ok).toBe(false);
      if (!setujuB.ok) {
        expect(setujuB.error.type).toBe("conflict");
        const ketersediaan = (setujuB.error as { availability?: { slots?: Array<{ startTime: string; available: boolean }> } })
          .availability;
        expect(ketersediaan).toBeDefined();
        expect(ketersediaan?.slots?.some((slot) => slot.startTime === "10:00" && !slot.available)).toBe(true);
      }

      const ulangB = await prisma.reservation.findUnique({ where: { id: b.id }, select: { status: true } });
      expect(ulangB?.status).toBe("PENDING");

      const tolakB = await service.rejectReservationService(
        f.staffId,
        b.id,
        { alasan: "Slot sudah terisi reservasi lain yang disetujui" },
        SEKARANG,
      );
      expect(tolakB.ok).toBe(true);
      if (tolakB.ok) {
        expect(tolakB.data.status).toBe("REJECTED");
        expect(tolakB.data.alasan).toBe("Slot sudah terisi reservasi lain yang disetujui");
      }
    } finally {
      await f.cleanup();
    }
  });

  it("tepi berimpit bukan konflik: keduanya bisa APPROVED", async () => {
    const f = await siapkanFixture();
    try {
      const c = await buatPending(f, 0, "10:00", "11:00", SEKARANG);
      const d = await buatPending(f, 1, "11:00", "12:00", new Date(SEKARANG.getTime() + 60_000));

      expect((await service.approveReservationService(f.staffId, c.id, SEKARANG)).ok).toBe(true);
      const setujuD = await service.approveReservationService(f.staffId, d.id, SEKARANG);
      expect(setujuD.ok).toBe(true);
    } finally {
      await f.cleanup();
    }
  });

  it("approve bersamaan atas slot bertabrakan: tepat satu berhasil", async () => {
    const f = await siapkanFixture();
    try {
      const a = await buatPending(f, 0, "10:00", "11:00", SEKARANG);
      const b = await buatPending(f, 1, "10:30", "12:00", new Date(SEKARANG.getTime() + 60_000));

      const [hasilA, hasilB] = await Promise.all([
        service.approveReservationService(f.staffId, a.id, SEKARANG),
        service.approveReservationService(f.staffId, b.id, SEKARANG),
      ]);
      expect([hasilA.ok, hasilB.ok].filter(Boolean)).toHaveLength(1);

      const status = await prisma.reservation.findMany({
        where: { id: { in: [a.id, b.id] } },
        select: { id: true, status: true },
      });
      expect(status.filter((row) => row.status === "APPROVED")).toHaveLength(1);
      expect(status.filter((row) => row.status === "PENDING")).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  });
});
