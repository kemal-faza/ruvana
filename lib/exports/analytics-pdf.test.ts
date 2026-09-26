// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { AnalyticsExportModel, AnalyticsExportSection } from "@/lib/exports/analytics-export-model";
import { buildAnalyticsPdfDefinition, serializeAnalyticsPdf } from "@/lib/exports/analytics-pdf";

const sectionTitles = [
  "Ringkasan",
  "Okupansi",
  "Laporan per fasilitas",
  "Laporan per kategori",
  "Laporan per status",
  "Status fasilitas saat ini",
] as const;

function section(
  key: AnalyticsExportSection["key"],
  title: string,
  columns: string[],
  rows: string[][],
): AnalyticsExportSection {
  return { key, title, columns, rows };
}

function makeModel(overrides: Partial<AnalyticsExportModel> = {}): AnalyticsExportModel {
  const sections = [
    section("summary", "Ringkasan", ["Informasi", "Nilai"], [["Jumlah laporan", "1"]]),
    section("occupancy", "Okupansi", ["Metrik", "Nilai"], [["Okupansi", "12,5"]]),
    section("reportsByFacility", "Laporan per fasilitas", ["Fasilitas", "Jumlah laporan"], [["Gedung A", "1"]]),
    section("reportsByCategory", "Laporan per kategori", ["Kategori", "Jumlah laporan"], [["Kebersihan", "1"]]),
    section("reportsByStatus", "Laporan per status", ["Status", "Jumlah laporan"], [["DIPROSES", "1"]]),
    section("facilityStatuses", "Status fasilitas saat ini", ["Status", "Jumlah", "Nama"], [["Aktif", "1", "Gedung A"]]),
  ];
  return {
    metadata: {
      startDate: "2026-09-01",
      endDate: "2026-09-26",
      location: "Kampus Depok",
      createdAtIso: "2026-09-26T02:00:00.000Z",
      createdAtWib: "26-09-2026 09:00:00 WIB",
    },
    sections,
    csvRows: [],
    isEmpty: false,
    emptyMessage: null,
    ...overrides,
  };
}

function tableNodes(definition: ReturnType<typeof buildAnalyticsPdfDefinition>) {
  const content = (definition as unknown as { content: unknown[] }).content;
  type TableNode = { table: { body: unknown[][]; headerRows?: number; keepWithHeaderRows?: number; dontBreakRows?: boolean } };
  const found: TableNode[] = [];
  const visit = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (typeof node !== "object" || node === null) continue;
      if ("table" in node) found.push(node as TableNode);
      if ("stack" in node && Array.isArray(node.stack)) visit(node.stack);
    }
  };
  visit(content);
  return found;
}

describe("analytics PDF", () => {
  it("builds six labeled landscape A4 sections with repeating table headers and methodology", () => {
    const model = makeModel({
      csvRows: [
        {
          jenis_rekap: "METODOLOGI",
          dimensi: "okupansi",
          label: "Formula kapasitas",
          status: "",
          nilai: "Jumlah fasilitas × hari × menit operasional",
          satuan: "",
          periode_mulai: "2026-09-01",
          periode_selesai: "2026-09-26",
          lokasi: "Kampus Depok",
          dibuat_pada_wib: "26-09-2026 09:00:00 WIB",
          keterangan: "Formula untuk kapasitas periode.",
        },
      ],
    });
    const definition = buildAnalyticsPdfDefinition(model);
    const document = definition as unknown as { content: unknown[]; pageSize: string; pageOrientation: string; footer: unknown };
    const contentText = JSON.stringify(document.content);
    const tables = tableNodes(definition);

    expect(document.pageSize).toBe("A4");
    expect(document.pageOrientation).toBe("landscape");
    for (const title of sectionTitles) expect(contentText).toContain(title);
    expect(contentText).toContain("Kampus Depok");
    expect(contentText).toContain("2026-09-01");
    expect(contentText).toContain("Formula kapasitas");
    expect(tables.length).toBeGreaterThanOrEqual(7);
    expect(tables.every(({ table }) => table.headerRows === 1 && table.keepWithHeaderRows === 1 && table.dontBreakRows)).toBe(true);
    expect(typeof document.footer).toBe("function");
  });

  it("retains every aggregate row when a table exceeds 1000 items", () => {
    const rows = Array.from({ length: 1_001 }, (_, index) => [`Fasilitas ${index + 1}`, String(index + 1)]);
    const definition = buildAnalyticsPdfDefinition(
      makeModel({
        sections: [
          ...makeModel().sections.filter(({ key }) => key !== "reportsByFacility"),
          section("reportsByFacility", "Laporan per fasilitas", ["Fasilitas", "Jumlah laporan"], rows),
        ],
      }),
    );
    const reportTables = tableNodes(definition).filter(({ table }) =>
      table.body.some((row) => JSON.stringify(row).includes("Fasilitas ")),
    );

    expect(reportTables).toHaveLength(2);
    expect(reportTables.reduce((count, { table }) => count + table.body.length - 1, 0)).toBe(1_001);
    expect(JSON.stringify(reportTables)).toContain("Fasilitas 1001");
  });

  it("returns a readable PDF with embedded font, Unicode labels and page numbers", async () => {
    const pdf = await serializeAnalyticsPdf(
      makeModel({
        sections: makeModel().sections.map((current) =>
          current.key === "reportsByCategory"
            ? { ...current, rows: [["Kenyamanan & aksesibilitas — ruang kuliah", "3"]] }
            : current,
        ),
      }),
    );
    const pdfText = pdf.toString("latin1");

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdfText).toContain("/FontFile2");
    expect(pdfText).toContain("/MediaBox [0 0 841.89 595.28]");
    expect(pdfText).toMatch(/\/Type \/Page\b/u);
    expect(pdfText).toContain("%%EOF");
    expect(pdf.byteLength).toBeGreaterThan(10_000);
  });

  it("produces a valid empty-state PDF with an explanation", async () => {
    const model = makeModel({
      sections: makeModel().sections.map((current) => ({
        ...current,
        rows: current.rows.length > 0 ? current.rows : [["Tidak ada data", "0"]],
      })),
      isEmpty: true,
      emptyMessage: "Tidak ada data laporan atau fasilitas yang cocok dengan filter ini.",
    });
    const definitionText = JSON.stringify(buildAnalyticsPdfDefinition(model));
    const pdf = await serializeAnalyticsPdf(model);

    expect(definitionText).toContain("Tidak ada data laporan atau fasilitas yang cocok dengan filter ini.");
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("%%EOF");
  });

  it("renders 1001 aggregate rows across multiple pages without limiting the content", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) => [
      `Fasilitas ${index + 1}`,
      String(index + 1),
    ]);
    const model = makeModel({
      sections: makeModel().sections.map((current) =>
        current.key === "reportsByFacility"
          ? { ...current, rows }
          : current,
      ),
    });
    const pdf = await serializeAnalyticsPdf(model);
    const pdfText = pdf.toString("latin1");
    const pageCount = (pdfText.match(/\/Type \/Page\b/gu) ?? []).length;

    expect(pageCount).toBeGreaterThan(10);
    expect(pdfText).toContain("/Count");
    expect(pdfText).toContain("%%EOF");
    expect(pdf.byteLength).toBeGreaterThan(100_000);
  });
});
