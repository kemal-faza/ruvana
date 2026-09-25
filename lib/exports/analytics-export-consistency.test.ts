import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { serializeAnalyticsCsv } from "@/lib/exports/analytics-csv";
import { buildAnalyticsExportModel } from "@/lib/exports/analytics-export-model";
import { buildAnalyticsPdfDefinition } from "@/lib/exports/analytics-pdf";
import { serializeAnalyticsXlsx } from "@/lib/exports/analytics-xlsx";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const snapshot: AnalyticsSnapshot = {
  filters: { startDate: "2026-09-01", endDate: "2026-09-02", location: null },
  locations: ["Kampus Depok"],
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
      { label: "Kelistrikan", count: 3 },
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
    reservationDateRule: "Reservasi memakai tanggal kalender kampus Asia/Jakarta dalam rentang inklusif.",
    approvedStatusRule: "Hanya durasi reservasi APPROVED yang masuk ke pembilang.",
    reportCreationDateRule: "Laporan memakai waktu dibuat dalam rentang tanggal kalender Asia/Jakarta.",
    facilityStatusNote: "Status fasilitas adalah snapshot saat ini.",
  },
};

function parseCsv(csv: string): string[][] {
  const source = csv.replace(/^\uFEFF/u, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && character === "\r" && source[index + 1] === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      index += 1;
    } else {
      value += character;
    }
  }

  return rows;
}

function collectPdfText(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectPdfText);
  if (value === null || typeof value !== "object") return [];

  const object = value as Record<string, unknown>;
  const ownText = typeof object.text === "string" ? [object.text] : [];
  return [...ownText, ...Object.values(object).flatMap(collectPdfText)];
}

async function readWorkbook(bytes: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  return workbook;
}

describe("analytics export consistency", () => {
  it("keeps snapshot metadata and every logical row in CSV, XLSX, and PDF", async () => {
    const model = buildAnalyticsExportModel(snapshot);
    const csv = parseCsv(serializeAnalyticsCsv(model.csvRows));
    const expectedCsv = model.csvRows.map((row) => [
      row.jenis_rekap,
      row.dimensi,
      row.label,
      row.status,
      String(row.nilai),
      row.satuan,
      row.periode_mulai,
      row.periode_selesai,
      row.lokasi,
      row.dibuat_pada_wib,
      row.keterangan,
    ]);

    expect(csv.slice(1)).toEqual(expectedCsv);
    expect(model.metadata).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      location: "Semua lokasi",
      createdAtIso: "2026-09-26T02:00:00.000Z",
      createdAtWib: "26-09-2026 09:00:00 WIB",
    });

    const workbook = await readWorkbook(await serializeAnalyticsXlsx(model));
    expect(workbook.worksheets.map(({ name }) => name)).toEqual(model.sections.map(({ title }) => title));
    for (const section of model.sections) {
      const worksheet = workbook.getWorksheet(section.title);
      expect(worksheet).toBeDefined();
      const values: string[][] = [];
      worksheet?.eachRow({ includeEmpty: false }, (row) => {
        values.push(
          Array.from({ length: section.columns.length }, (_, index) =>
            String(row.getCell(index + 1).value ?? ""),
          ),
        );
      });
      expect(values).toEqual([section.columns, ...section.rows]);
    }

    const pdfText = collectPdfText(buildAnalyticsPdfDefinition(model)).join("\n");
    for (const section of model.sections) {
      expect(pdfText).toContain(section.title);
      for (const value of section.rows.flat()) expect(pdfText).toContain(value);
    }
    expect(pdfText).toContain(model.metadata.createdAtWib);
    expect(pdfText).toContain(snapshot.methodology.reservationDateRule);
    expect(pdfText).toContain(snapshot.methodology.approvedStatusRule);
  });

  it("includes every occupancy and date rule in the XLSX summary", () => {
    const model = buildAnalyticsExportModel(snapshot);
    const summaryRows = model.sections.find(({ key }) => key === "summary")?.rows ?? [];

    for (const rule of [
      snapshot.methodology.capacityFormula,
      snapshot.methodology.occupancyFormula,
      snapshot.methodology.reservationDateRule,
      snapshot.methodology.approvedStatusRule,
      snapshot.methodology.reportCreationDateRule,
      snapshot.methodology.facilityStatusNote,
    ]) {
      expect(summaryRows.flat()).toContain(rule);
    }
  });

  it("keeps all 1001 facility groups in each export format", async () => {
    const byFacility = Array.from({ length: 1_001 }, (_, index) => ({
      facilityId: index + 1,
      label: `Fasilitas ${index + 1}`,
      count: 1,
    }));
    const model = buildAnalyticsExportModel({
      ...snapshot,
      reports: { ...snapshot.reports, total: 1_001, byFacility },
    });

    const csvFacilityRows = parseCsv(serializeAnalyticsCsv(model.csvRows))
      .slice(1)
      .filter(([kind]) => kind === "LAPORAN_FASILITAS");
    expect(csvFacilityRows).toHaveLength(1_001);
    expect(csvFacilityRows[0]?.[2]).toBe("Fasilitas 1");
    expect(csvFacilityRows.at(-1)?.[2]).toBe("Fasilitas 1001");

    const workbook = await readWorkbook(await serializeAnalyticsXlsx(model));
    const worksheet = workbook.getWorksheet("Laporan per fasilitas");
    expect(worksheet?.rowCount).toBe(1_002);
    expect(worksheet?.getCell("A2").value).toBe("Fasilitas 1");
    expect(worksheet?.getCell("A1002").value).toBe("Fasilitas 1001");

    const pdfText = collectPdfText(buildAnalyticsPdfDefinition(model)).join("\n");
    expect(pdfText).toContain("Fasilitas 1");
    expect(pdfText).toContain("Fasilitas 1001");
  });
});
