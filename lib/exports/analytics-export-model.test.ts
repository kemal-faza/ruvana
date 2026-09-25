import { describe, expect, it } from "vitest";

import {
  buildAnalyticsExportModel,
} from "@/lib/exports/analytics-export-model";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const snapshot: AnalyticsSnapshot = {
  filters: { startDate: "2026-09-01", endDate: "2026-09-02", location: null },
  locations: ["Gedung A", "Gedung B"],
  metadata: { generatedAt: new Date("2026-09-26T02:00:00.000Z") },
  occupancy: {
    facilityCount: 3,
    dayCount: 2,
    totalApprovedMinutes: 120,
    capacityMinutes: 4680,
    occupancyPercent: (120 / 4680) * 100,
    unavailableReason: null,
  },
  facilityStatuses: {
    ACTIVE: ["Ruang Alfa"],
    UNDER_MAINTENANCE: ["Aula Utama"],
    INACTIVE: ["Laboratorium Lama"],
  },
  reports: {
    total: 4,
    byFacility: [
      { facilityId: 1, label: "Ruang Alfa", count: 3 },
      { facilityId: 2, label: "Aula Utama", count: 1 },
    ],
    byCategory: [
      { label: "Listrik", count: 3 },
      { label: "Peralatan", count: 1 },
    ],
    byStatus: [
      { status: "NEW", label: "Baru", count: 3 },
      { status: "RESOLVED", label: "Selesai", count: 1 },
    ],
  },
  methodology: {
    timezone: "Asia/Jakarta",
    minutesPerDay: 780,
    capacityFormula: "Jumlah fasilitas × jumlah hari kalender inklusif × menit operasional per hari.",
    occupancyFormula: "Total menit reservasi APPROVED ÷ kapasitas periode × 100%.",
    reservationDateRule: "Reservasi memakai tanggal kalender kampus dalam rentang inklusif.",
    approvedStatusRule: "Hanya durasi reservasi berstatus APPROVED yang masuk ke pembilang.",
    facilityStatusNote: "Status fasilitas adalah snapshot saat ini.",
    reportCreationDateRule: "Laporan dihitung berdasarkan createdAt dalam Asia/Jakarta.",
  },
};

describe("analytics export model", () => {
  it("builds the six shared workbook/PDF sections from one snapshot", () => {
    const model = buildAnalyticsExportModel(snapshot);

    expect(model.sections.map(({ title }) => title)).toEqual([
      "Ringkasan",
      "Okupansi",
      "Laporan per fasilitas",
      "Laporan per kategori",
      "Laporan per status",
      "Status fasilitas saat ini",
    ]);
    expect(model.metadata).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      location: "Semua lokasi",
      createdAtIso: "2026-09-26T02:00:00.000Z",
      createdAtWib: "26-09-2026 09:00:00 WIB",
    });
    expect(model.sections[0]?.rows).toContainEqual(["Jumlah laporan", "4", "laporan", ""]);
  });

  it("preserves every snapshot breakdown, status label, and current facility name", () => {
    const model = buildAnalyticsExportModel(snapshot);
    const kinds = model.csvRows.map((row) => row.jenis_rekap);

    expect(model.csvRows.filter((row) => row.jenis_rekap === "LAPORAN_TOTAL")).toHaveLength(1);
    expect(model.csvRows.filter((row) => row.jenis_rekap === "LAPORAN_FASILITAS").map(({ label, nilai }) => [label, nilai])).toEqual([
      ["Ruang Alfa", 3],
      ["Aula Utama", 1],
    ]);
    expect(model.csvRows.filter((row) => row.jenis_rekap === "LAPORAN_KATEGORI").map(({ label, nilai }) => [label, nilai])).toEqual([
      ["Listrik", 3],
      ["Peralatan", 1],
    ]);
    expect(model.csvRows.filter((row) => row.jenis_rekap === "LAPORAN_STATUS").map(({ status, nilai }) => [status, nilai])).toEqual([
      ["Baru", 3],
      ["Selesai", 1],
    ]);
    expect(model.csvRows.some((row) => row.jenis_rekap === "STATUS_FASILITAS" && row.label === "Laboratorium Lama")).toBe(true);
    expect(kinds).toContain("OKUPANSI");
    expect(kinds).toContain("METODOLOGI");
  });

  it("keeps one timestamp and repeated filter metadata on every CSV row", () => {
    const model = buildAnalyticsExportModel({
      ...snapshot,
      filters: { ...snapshot.filters, location: "Gedung A" },
    });

    expect(model.csvRows.length).toBeGreaterThan(0);
    for (const row of model.csvRows) {
      expect(row.periode_mulai).toBe("2026-09-01");
      expect(row.periode_selesai).toBe("2026-09-02");
      expect(row.lokasi).toBe("Gedung A");
      expect(row.dibuat_pada_wib).toBe("26-09-2026 09:00:00 WIB");
    }
  });

  it("keeps empty snapshots valid and carries a clear no-data explanation", () => {
    const empty: AnalyticsSnapshot = {
      ...snapshot,
      occupancy: {
        facilityCount: 0,
        dayCount: 2,
        totalApprovedMinutes: 0,
        capacityMinutes: 0,
        occupancyPercent: null,
        unavailableReason: "Tidak ada fasilitas yang cocok dengan filter.",
      },
      facilityStatuses: { ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] },
      reports: { total: 0, byFacility: [], byCategory: [], byStatus: [] },
    };
    const model = buildAnalyticsExportModel(empty);

    expect(model.isEmpty).toBe(true);
    expect(model.csvRows).toContainEqual(expect.objectContaining({
      jenis_rekap: "LAPORAN_TOTAL",
      nilai: 0,
      keterangan: expect.stringContaining("Tidak ada laporan"),
    }));
    expect(model.csvRows).toContainEqual(expect.objectContaining({
      jenis_rekap: "METODOLOGI",
      label: "Keadaan data",
      keterangan: expect.stringContaining("Tidak ada data"),
    }));
    expect(model.sections.every(({ rows }) => rows.length > 0)).toBe(true);
  });

  it("shows zero capacity as not computable and preserves the calculation methodology", () => {
    const model = buildAnalyticsExportModel({
      ...snapshot,
      occupancy: {
        facilityCount: 0,
        dayCount: 2,
        totalApprovedMinutes: 0,
        capacityMinutes: 0,
        occupancyPercent: null,
        unavailableReason: "Tidak ada fasilitas.",
      },
      facilityStatuses: { ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] },
    });

    expect(model.csvRows).toContainEqual(expect.objectContaining({
      jenis_rekap: "OKUPANSI",
      label: "Okupansi",
      nilai: "Tidak dapat dihitung",
      keterangan: "Tidak ada fasilitas.",
    }));
    expect(model.csvRows.some((row) => row.jenis_rekap === "METODOLOGI" && row.label === "Formula okupansi")).toBe(true);
  });
});
