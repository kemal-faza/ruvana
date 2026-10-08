import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Database khusus tahap ini agar kepemilikan fixture jelas. Wajib loopback +
// database lokal, mengikuti pola reservation-approval/report-timestamps. Tanpa
// var ini seluruh suite di-skip (CI tanpa PostgreSQL tetap hijau).
const databaseUrl = process.env.REPORT_PROCESSING_TEST_DATABASE_URL;

function requireLoopbackDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("Set REPORT_PROCESSING_TEST_DATABASE_URL to run PostgreSQL integration coverage.");
  }

  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("REPORT_PROCESSING_TEST_DATABASE_URL must point to a loopback PostgreSQL host.");
  }
  if (!/^\/(ruvana|ruvana_test)$/.test(url.pathname)) {
    throw new Error("REPORT_PROCESSING_TEST_DATABASE_URL must use the local `ruvana` or `ruvana_test` database.");
  }

  return value;
}

describe.skipIf(!databaseUrl)("integrasi PostgreSQL pemrosesan laporan petugas (REP-03)", () => {
  let disconnect: (() => Promise<void>) | undefined;
  let prisma: typeof import("@/lib/prisma").prisma;
  let service: typeof import("@/lib/services/report-processing-service");

  const key = randomUUID();
  const dibuat = { laporan: [] as number[], pengguna: [] as number[], fasilitas: [] as number[] };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireLoopbackDatabaseUrl(databaseUrl);
    const database = await import("@/lib/prisma");
    prisma = database.prisma;
    disconnect = () => prisma.$disconnect();
    service = await import("@/lib/services/report-processing-service");
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.report.deleteMany({ where: { id: { in: dibuat.laporan } } });
      await prisma.facility.deleteMany({ where: { id: { in: dibuat.fasilitas } } });
      await prisma.user.deleteMany({ where: { id: { in: dibuat.pengguna } } });
    }
    await disconnect?.();
  });

  async function buatPetugas(label: string, role: "petugas" | "admin" = "petugas") {
    const user = await prisma.user.create({
      data: {
        nama: `Petugas uji ${label} ${key}`,
        email: `rep03-${label}-${key}@example.invalid`,
        password: "test-only",
        role,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    dibuat.pengguna.push(user.id);
    return user.id;
  }

  async function buatFasilitas() {
    const facility = await prisma.facility.create({
      data: {
        nama: `Ruang uji REP-03 ${key} ${dibuat.fasilitas.length}`,
        tipe: "ruang_kelas",
        lokasi: "Gedung Uji Lt.1",
        kapasitas: 20,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    dibuat.fasilitas.push(facility.id);
    return facility.id;
  }

  async function buatLaporan(pelaporId: number, facilityId: number) {
    const report = await prisma.report.create({
      data: {
        userId: pelaporId,
        facilityId,
        kategori: "Listrik",
        deskripsi: `Lampu uji REP-03 ${key}`,
      },
      select: { id: true },
    });
    dibuat.laporan.push(report.id);
    return report.id;
  }

  async function baris(id: number) {
    return prisma.report.findUniqueOrThrow({
      where: { id },
      select: { status: true, ditanganiOleh: true, catatanResolusi: true, waktuDiproses: true },
    });
  }

  it("menyimpan status, petugas penanganan, dan satu instant pemrosesan", async () => {
    const petugas = await buatPetugas("start");
    const fasilitas = await buatFasilitas();
    const laporan = await buatLaporan(petugas, fasilitas);
    const now = new Date();

    const hasil = await service.startStaffReportService(petugas, laporan, now);

    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.data.status).toBe("IN_PROGRESS");
      expect(hasil.data.processedAt).toBe(now.toISOString());
      expect(hasil.data.ditanganiOleh).toEqual(expect.objectContaining({ id: petugas }));
    }
    const row = await baris(laporan);
    expect(row).toEqual({
      status: "IN_PROGRESS",
      ditanganiOleh: petugas,
      catatanResolusi: null,
      waktuDiproses: now,
    });
  });

  it("menolak pembukaan kembali status terminal tanpa mengubah laporan", async () => {
    const petugas = await buatPetugas("terminal");
    const fasilitas = await buatFasilitas();
    const laporan = await buatLaporan(petugas, fasilitas);
    await service.startStaffReportService(petugas, laporan, new Date());

    const selesai = await service.resolveStaffReportService(petugas, laporan, "Lampu diganti dan diuji.", new Date());
    expect(selesai.ok).toBe(true);

    const ulang = await service.startStaffReportService(petugas, laporan, new Date());
    expect(ulang).toMatchObject({ ok: false, error: { type: "transition" } });

    const row = await baris(laporan);
    expect(row.status).toBe("RESOLVED");
    expect(row.catatanResolusi).toBe("Lampu diganti dan diuji.");
  });

  it("menolak transisi di luar state machine tanpa mengubah laporan", async () => {
    const petugas = await buatPetugas("transisi");
    const fasilitas = await buatFasilitas();
    const laporan = await buatLaporan(petugas, fasilitas);

    // NEW tidak dapat langsung RESOLVED.
    const hasil = await service.resolveStaffReportService(petugas, laporan, "Catatan.", new Date());
    expect(hasil).toMatchObject({ ok: false, error: { type: "transition" } });

    const row = await baris(laporan);
    expect(row).toEqual({
      status: "NEW",
      ditanganiOleh: null,
      catatanResolusi: null,
      waktuDiproses: null,
    });
  });

  it("menyembunyikan laporan yang tidak ada sebagai not_found", async () => {
    const petugas = await buatPetugas("hilang");

    const hasil = await service.startStaffReportService(petugas, 2_000_000_000, new Date());

    expect(hasil).toEqual({ ok: false, error: { type: "not_found", message: "Laporan tidak ditemukan" } });
  });

  it("menyerialkan dua petugas yang memulai laporan yang sama", async () => {
    const petugasA = await buatPetugas("balapan-a");
    const petugasB = await buatPetugas("balapan-b", "admin");
    const fasilitas = await buatFasilitas();
    const laporan = await buatLaporan(petugasA, fasilitas);

    const [a, b] = await Promise.all([
      service.startStaffReportService(petugasA, laporan, new Date()),
      service.startStaffReportService(petugasB, laporan, new Date()),
    ]);

    expect([a, b].filter((hasil) => hasil.ok)).toHaveLength(1);
    expect([a, b].filter((hasil) => !hasil.ok && hasil.error.type === "transition")).toHaveLength(1);
    const row = await baris(laporan);
    expect(row.status).toBe("IN_PROGRESS");
    expect([petugasA, petugasB]).toContain(row.ditanganiOleh);
  });

  it("menyerialkan resolve dan reject yang berjalan bersamaan", async () => {
    const petugas = await buatPetugas("final-a");
    const admin = await buatPetugas("final-b", "admin");
    const fasilitas = await buatFasilitas();
    const laporan = await buatLaporan(petugas, fasilitas);
    await service.startStaffReportService(petugas, laporan, new Date());

    const [selesai, tolak] = await Promise.all([
      service.resolveStaffReportService(petugas, laporan, "Selesai.", new Date()),
      service.rejectStaffReportService(admin, laporan, "Ditolak.", new Date()),
    ]);

    expect([selesai, tolak].filter((hasil) => hasil.ok)).toHaveLength(1);
    const row = await baris(laporan);
    expect(["RESOLVED", "REJECTED"]).toContain(row.status);
    expect(row.catatanResolusi).not.toBeNull();
  });

  it("memisahkan antrean masuk, daftar pekerjaan, dan riwayat sesuai status", async () => {
    const petugas = await buatPetugas("antrean");
    const fasilitas = await buatFasilitas();
    const baru = await buatLaporan(petugas, fasilitas);
    const berjalan = await buatLaporan(petugas, fasilitas);
    await service.startStaffReportService(petugas, berjalan, new Date());
    const selesai = await buatLaporan(petugas, fasilitas);
    await service.startStaffReportService(petugas, selesai, new Date());
    await service.resolveStaffReportService(petugas, selesai, "Selesai.", new Date());
    const ditolak = await buatLaporan(petugas, fasilitas);
    await service.rejectStaffReportService(petugas, ditolak, "Ditolak.", new Date());

    const intake = await service.listStaffReportQueueService({ queue: "intake", urut: "terlama", page: 1, perPage: 100 });
    const work = await service.listStaffReportQueueService({ queue: "work", urut: "terlama", page: 1, perPage: 100 });
    const riwayat = await service.listStaffReportQueueService({ queue: "riwayat", urut: "terbaru", page: 1, perPage: 100 });

    const idIntake = intake.items.map((item) => item.id);
    const idWork = work.items.map((item) => item.id);
    const idRiwayat = riwayat.items.map((item) => item.id);

    expect(intake.items.every((item) => item.status === "NEW")).toBe(true);
    expect(work.items.every((item) => item.status === "NEW" || item.status === "IN_PROGRESS")).toBe(true);
    expect(riwayat.items.every((item) => item.status === "RESOLVED" || item.status === "REJECTED")).toBe(true);
    expect(idIntake).toContain(baru);
    expect(idIntake).not.toContain(berjalan);
    expect(idWork).toEqual(expect.arrayContaining([baru, berjalan]));
    expect(idRiwayat).toEqual(expect.arrayContaining([selesai, ditolak]));
    expect(idRiwayat).not.toContain(baru);

    // Urutan terbaru menurun berdasarkan createdAt lalu id.
    const waktuRiwayat = riwayat.items.map((item) => item.createdAt);
    expect([...waktuRiwayat].sort().reverse()).toEqual(waktuRiwayat);

    // Pathname foto private TIDAK pernah ikut pada respons petugas.
    expect(JSON.stringify(riwayat)).not.toContain("reports/");
  });

  it("menghitung total antrean dan halaman mengikuti filter status yang sama", async () => {
    const petugas = await buatPetugas("paginasi");
    const fasilitas = await buatFasilitas();
    await buatLaporan(petugas, fasilitas);

    const halaman = await service.listStaffReportQueueService({ queue: "intake", urut: "terlama", page: 1, perPage: 1 });

    expect(halaman.meta.perPage).toBe(1);
    expect(halaman.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(halaman.meta.totalPages).toBe(Math.ceil(halaman.meta.totalItems / 1));
    expect(halaman.meta.page).toBe(1);
  });
});
