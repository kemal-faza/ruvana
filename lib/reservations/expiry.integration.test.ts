import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asiaJakartaToUtc, calendarDateToUtcMidnight } from "@/lib/time/reservation-time";

// Wajib database KHUSUS (ruvana_expiry_test), bukan `ruvana` atau
// `ruvana_test`. `expirePendingReservations` menjalankan updateMany lintas
// tabel tanpa scope, sehingga suite ini tidak boleh berbagi database dengan
// siapa pun: berbagi `ruvana_test` membuat sweep bertanggal 2027 mengubah
// fixture suite lain di tengah jalan, dan mengarahkannya ke `ruvana` akan
// mengedipkan reservasi PENDING milik pengembang. Mengikuti pola integrasi
// lain: tanpa var ini seluruh suite di-skip (CI tanpa PostgreSQL tetap
// hijau). Wajib loopback + database lokal.
const databaseUrl = process.env.RESERVATION_EXPIRY_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set RESERVATION_EXPIRY_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("RESERVATION_EXPIRY_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/ruvana_expiry_test$/.test(url.pathname)) {
    throw new Error(
      "RESERVATION_EXPIRY_TEST_DATABASE_URL must use a dedicated `ruvana_expiry_test` database. " +
        "The expiry sweep is table-wide, so sharing a database with other suites or with development data is unsafe.",
    );
  }

  return value;
}

// Tanggal jauh di masa depan: imun aturan pengajuan H-1 Tahap 7. Batas
// kedaluwarsa ditentukan lewat param `now` eksplisit agar deterministik.
const KAPAN = "2027-06-15";
// Tanggal yang sudah lewat dari waktu nyata untuk uji riwayat dan antrean.
const LEWAT = "2026-09-15";
const NOW = asiaJakartaToUtc(KAPAN, "12:00");

type StatusReservasiTampil =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED_BY_USER"
  | "CANCELLED_BY_OFFICER"
  | "EXPIRED";

// Status selain PENDING yang harus dibiarkan oleh sweep.
const STATUS_NON_PENDING = [
  "APPROVED",
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_OFFICER",
  "EXPIRED",
] as const;

type PrismaTest = typeof import("@/lib/prisma").prisma;

async function buatPengguna(prisma: PrismaTest, key: string) {
  return prisma.user.create({
    data: {
      nama: `Pengguna uji expiry ${key}`,
      email: `expiry-${key}@example.invalid`,
      password: "test-only",
      role: "pengguna",
      status: "ACTIVE",
    },
    select: { id: true },
  });
}

async function buatFasilitas(prisma: PrismaTest, key: string) {
  return prisma.facility.create({
    data: {
      nama: `Ruang uji expiry ${key}`,
      tipe: "ruang_kelas",
      lokasi: "Gedung Uji",
      kapasitas: 10,
    },
    select: { id: true },
  });
}

async function buatReservasi(
  prisma: PrismaTest,
  entitas: { userId: number; facilityId: number },
  hari: string,
  mulai: string,
  selesai: string,
  status: StatusReservasiTampil,
  tujuan: string,
) {
  return prisma.reservation.create({
    data: {
      userId: entitas.userId,
      facilityId: entitas.facilityId,
      tanggal: calendarDateToUtcMidnight(hari),
      startTime: asiaJakartaToUtc(hari, mulai),
      endTime: asiaJakartaToUtc(hari, selesai),
      tujuanPenggunaan: tujuan,
      status,
    },
    select: { id: true },
  });
}

async function bersihkan(prisma: PrismaTest, user: { id: number }, facility: { id: number }) {
  await prisma.reservation.deleteMany({ where: { userId: user.id } });
  await prisma.facility.delete({ where: { id: facility.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

describe.skipIf(!databaseUrl)("integrasi PostgreSQL kedaluwarsa reservasi (RES-08)", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: PrismaTest;
  let expiry: typeof import("./expiry");
  let services: typeof import("@/lib/services/reservation-service");

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    expiry = await import("./expiry");
    services = await import("@/lib/services/reservation-service");
  });

  afterAll(async () => {
    await disconnect?.();
  });

  it("mengubah PENDING dengan waktu mulai sudah lewat menjadi EXPIRED", async () => {
    const key = randomUUID();
    const user = await buatPengguna(prisma, key);
    const facility = await buatFasilitas(prisma, key);
    const lewat = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "09:00", "09:30", "PENDING", `Lewat ${key}`);
    const batas = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "12:00", "12:30", "PENDING", `Batas ${key}`);

    try {
      const hasil = await expiry.expirePendingReservations(prisma, NOW);
      // Hitungan eksak aman karena database khusus: hanya baris uji ini yang
      // mungkin cocok, jadi sweep yang keliru mengenai baris lain tertangkap.
      expect(hasil.count).toBe(2);

      const baris = await prisma.reservation.findFirstOrThrow({ where: { id: lewat.id } });
      expect(baris.status).toBe("EXPIRED");
      expect(baris.alasan).toBe(expiry.ALASAN_KEDALUWARSA);
      expect(baris.waktuDiproses?.getTime()).toBe(NOW.getTime());

      // Batas inklusif: startTime tepat sama dengan now ikut kedaluwarsa.
      const barisBatas = await prisma.reservation.findFirstOrThrow({ where: { id: batas.id } });
      expect(barisBatas.status).toBe("EXPIRED");
      expect(barisBatas.diprosesOleh).toBeNull();
    } finally {
      await bersihkan(prisma, user, facility);
    }
  });

  it("tidak mengubah PENDING dengan waktu mulai di masa depan", async () => {
    const key = randomUUID();
    const user = await buatPengguna(prisma, key);
    const facility = await buatFasilitas(prisma, key);
    const depan = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "15:00", "15:30", "PENDING", `Depan ${key}`);

    try {
      await expiry.expirePendingReservations(prisma, NOW);

      const baris = await prisma.reservation.findFirstOrThrow({ where: { id: depan.id } });
      expect(baris.status).toBe("PENDING");
      expect(baris.alasan).toBeNull();
      expect(baris.waktuDiproses).toBeNull();
    } finally {
      await bersihkan(prisma, user, facility);
    }
  });

  it("tidak menyentuh status selain PENDING", async () => {
    const key = randomUUID();
    const user = await buatPengguna(prisma, key);
    const facility = await buatFasilitas(prisma, key);
    const idsByStatus = new Map<(typeof STATUS_NON_PENDING)[number], number>();
    let jam = 8;
    for (const status of STATUS_NON_PENDING) {
      idsByStatus.set(
        status,
        (
          await buatReservasi(
            prisma,
            { userId: user.id, facilityId: facility.id },
            KAPAN,
            `${jam}:00`,
            `${jam}:30`,
            status,
            `Status ${status} ${key}`,
          )
        ).id,
      );
      jam += 1;
    }
    const lewat = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "07:00", "07:30", "PENDING", `Pending lewat ${key}`);

    try {
      const hasil = await expiry.expirePendingReservations(prisma, NOW);
      expect(hasil.count).toBe(1);

      for (const [status, id] of idsByStatus) {
        const baris = await prisma.reservation.findFirstOrThrow({ where: { id } });
        expect(baris.status).toBe(status);
      }

      const barisLewat = await prisma.reservation.findFirstOrThrow({ where: { id: lewat.id } });
      expect(barisLewat.status).toBe("EXPIRED");
    } finally {
      await bersihkan(prisma, user, facility);
    }
  });

  it("idempoten: dijalankan dua kali menghasilkan keadaan akhir yang sama", async () => {
    const key = randomUUID();
    const user = await buatPengguna(prisma, key);
    const facility = await buatFasilitas(prisma, key);
    const lewat = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "09:00", "09:30", "PENDING", `Idempoten lewat ${key}`);
    const depan = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, KAPAN, "15:00", "15:30", "PENDING", `Idempoten depan ${key}`);

    try {
      const pertama = await expiry.expirePendingReservations(prisma, NOW);
      const kedua = await expiry.expirePendingReservations(prisma, NOW);

      expect(pertama.count).toBe(1);
      expect(kedua.count).toBe(0);

      const baris = await prisma.reservation.findFirstOrThrow({ where: { id: lewat.id } });
      expect(baris.status).toBe("EXPIRED");
      expect(baris.alasan).toBe(expiry.ALASAN_KEDALUWARSA);
      expect(baris.waktuDiproses?.getTime()).toBe(NOW.getTime());

      const barisDepan = await prisma.reservation.findFirstOrThrow({ where: { id: depan.id } });
      expect(barisDepan.status).toBe("PENDING");
      expect(barisDepan.alasan).toBeNull();
    } finally {
      await bersihkan(prisma, user, facility);
    }
  });

  it("EXPIRED tetap muncul di riwayat pemilik dan tidak muncul di antrean", async () => {
    const key = randomUUID();
    const user = await buatPengguna(prisma, key);
    const facility = await buatFasilitas(prisma, key);
    const lewat = await buatReservasi(prisma, { userId: user.id, facilityId: facility.id }, LEWAT, "09:00", "09:30", "PENDING", `Riwayat ${key}`);

    try {
      const riwayat = await services.listMyReservationsService(user.id, { page: 1, perPage: 50 });
      const item = riwayat.data.items.find((r) => r.id === lewat.id);
      expect(item?.status).toBe("EXPIRED");

      const antrean = await services.listStaffQueueService({ page: 1, perPage: 50 });
      const adaDiAntrean = antrean.data.items.some((r) => r.id === lewat.id);
      expect(adaDiAntrean).toBe(false);
    } finally {
      await bersihkan(prisma, user, facility);
    }
  });
});