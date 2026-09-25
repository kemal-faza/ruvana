import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildAnalyticsExportModel } from "@/lib/exports/analytics-export-model";
import { serializeAnalyticsXlsx } from "@/lib/exports/analytics-xlsx";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const snapshot: AnalyticsSnapshot = {
  filters: { startDate: "2026-09-01", endDate: "2026-09-02", location: null },
  locations: ["Gedung A"],
  metadata: { generatedAt: new Date("2026-09-02T04:00:00.000Z") },
  occupancy: {
    facilityCount: 1,
    dayCount: 2,
    totalApprovedMinutes: 120,
    capacityMinutes: 1560,
    occupancyPercent: (120 / 1560) * 100,
    unavailableReason: null,
  },
  facilityStatuses: {
    ACTIVE: ["Ruang Alfa"],
    UNDER_MAINTENANCE: ["Aula Utama"],
    INACTIVE: ["Laboratorium Lama"],
  },
  reports: {
    total: 2,
    byFacility: [{ facilityId: 1, label: "Ruang Alfa", count: 2 }],
    byCategory: [{ label: "Listrik", count: 2 }],
    byStatus: [{ status: "NEW", label: "Baru", count: 2 }],
  },
  methodology: {
    timezone: "Asia/Jakarta",
    minutesPerDay: 780,
    capacityFormula: "Jumlah fasilitas × jumlah hari kalender inklusif × menit operasional per hari.",
    occupancyFormula: "Total menit reservasi APPROVED ÷ kapasitas periode × 100%.",
    reservationDateRule: "Reservasi dihitung berdasarkan tanggal kalender kampus (Asia/Jakarta) dalam rentang inklusif.",
    approvedStatusRule: "Hanya durasi reservasi berstatus APPROVED yang masuk ke pembilang.",
    reportCreationDateRule: "Laporan dihitung berdasarkan waktu dibuat dalam kalender Asia/Jakarta.",
    facilityStatusNote:
      "Status fasilitas adalah snapshot saat ini. Histori status belum tersedia; fasilitas dalam perbaikan dan nonaktif tetap masuk kapasitas.",
  },
};

async function readWorkbook(bytes: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  return workbook;
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => worksheet.getCell(rowNumber, index + 1).value);
}

describe("analytics XLSX serializer", () => {
  it("writes every canonical section to a separate worksheet with matching metadata and rows", async () => {
    const model = buildAnalyticsExportModel(snapshot);
    const workbook = await readWorkbook(await serializeAnalyticsXlsx(model));

    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      "Ringkasan",
      "Okupansi",
      "Laporan per fasilitas",
      "Laporan per kategori",
      "Laporan per status",
      "Status fasilitas saat ini",
    ]);

    for (const section of model.sections) {
      const worksheet = workbook.getWorksheet(section.title);
      expect(worksheet).toBeDefined();
      expect(rowValues(worksheet!, 1, section.columns.length)).toEqual(section.columns);
      expect(
        Array.from({ length: section.rows.length }, (_, index) =>
          rowValues(worksheet!, index + 2, section.columns.length),
        ),
      ).toEqual(section.rows);
      expect(worksheet!.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    }

    const summary = workbook.getWorksheet("Ringkasan")!;
    const summaryValues = summary.getSheetValues().flat().filter((value): value is string => typeof value === "string");
    expect(summaryValues).toContain("2026-09-01 – 2026-09-02");
    expect(summaryValues).toContain("Semua lokasi");
    expect(summaryValues).toContain("02-09-2026 11:00:00 WIB");
    expect(summaryValues).toContain(snapshot.methodology.occupancyFormula);
    expect(summaryValues).toContain(snapshot.methodology.reportCreationDateRule);
  });

  it("keeps user supplied formula-like text as explicit string cells", async () => {
    const maliciousSnapshot: AnalyticsSnapshot = {
      ...snapshot,
      reports: {
        ...snapshot.reports,
        byCategory: [{ label: "=HYPERLINK(\"https://attacker.invalid\",\"buka\")", count: 1 }],
      },
      facilityStatuses: {
        ...snapshot.facilityStatuses,
        ACTIVE: ["+SUM(1,1)"],
      },
    };
    const model = buildAnalyticsExportModel(maliciousSnapshot);
    const workbook = await readWorkbook(await serializeAnalyticsXlsx(model));
    const categoryCell = workbook.getWorksheet("Laporan per kategori")!.getCell("A2");
    const facilityCell = workbook.getWorksheet("Status fasilitas saat ini")!.getCell("C2");

    expect(categoryCell.value).toBe('=HYPERLINK("https://attacker.invalid","buka")');
    expect(categoryCell.type).toBe(ExcelJS.ValueType.String);
    expect(categoryCell.formula).toBeUndefined();
    expect(facilityCell.value).toBe("+SUM(1,1)");
    expect(facilityCell.type).toBe(ExcelJS.ValueType.String);
    expect(facilityCell.formula).toBeUndefined();
  });

  it("keeps all worksheets, headers, and no-data explanations when the snapshot is empty", async () => {
    const emptySnapshot: AnalyticsSnapshot = {
      ...snapshot,
      locations: [],
      occupancy: {
        ...snapshot.occupancy,
        facilityCount: 0,
        totalApprovedMinutes: 0,
        capacityMinutes: 0,
        occupancyPercent: null,
        unavailableReason: "Tidak ada fasilitas yang cocok dengan lokasi ini.",
      },
      facilityStatuses: { ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] },
      reports: { total: 0, byFacility: [], byCategory: [], byStatus: [] },
    };
    const model = buildAnalyticsExportModel(emptySnapshot);
    const workbook = await readWorkbook(await serializeAnalyticsXlsx(model));

    expect(workbook.worksheets).toHaveLength(6);
    for (const section of model.sections) {
      const worksheet = workbook.getWorksheet(section.title)!;
      expect(rowValues(worksheet, 1, section.columns.length)).toEqual(section.columns);
      expect(worksheet.rowCount).toBeGreaterThan(1);
    }
    expect(workbook.getWorksheet("Ringkasan")!.getSheetValues().flat()).toContain(model.emptyMessage);
    expect(workbook.getWorksheet("Laporan per kategori")!.getCell("A2").value).toBe(
      "Tidak ada laporan kerusakan yang cocok dengan filter ini.",
    );
  });
});
