import * as PdfMakeModule from "pdfmake";
import type { TCreatedPdf } from "pdfmake";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import type { Content, ContentText, TDocumentDefinitions, TFontDictionary } from "pdfmake/interfaces";
import type { AnalyticsExportModel, AnalyticsExportSection } from "@/lib/exports/analytics-export-model";

type AnalyticsPdfSection = Pick<AnalyticsExportSection, "title" | "columns" | "rows"> & {
  key: AnalyticsExportSection["key"] | "methodology";
  emptyMessage?: string;
};

interface PdfMakeNodeApi {
  createPdf(definition: TDocumentDefinitions): TCreatedPdf;
  setFonts(fonts: TFontDictionary): void;
  setLocalAccessPolicy(callback: (path: string) => boolean): void;
  setUrlAccessPolicy(callback: (url: string) => boolean): void;
}

const require = createRequire(`${process.cwd()}/package.json`);
const pdfMakeNamespace = PdfMakeModule as unknown as { default?: PdfMakeNodeApi };
const pdfMake = pdfMakeNamespace.default ?? (PdfMakeModule as unknown as PdfMakeNodeApi);
const robotoDirectory = dirname(require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"));
const FONTS: TFontDictionary = {
  Roboto: {
    normal: require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: require.resolve("pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: require.resolve("pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: require.resolve("pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
  },
};
pdfMake.setFonts(FONTS);
pdfMake.setLocalAccessPolicy((path) => path.startsWith(`${robotoDirectory}/`));
pdfMake.setUrlAccessPolicy(() => false);

const TABLE_LAYOUT = {
  hLineWidth: (index: number) => (index === 1 ? 0.8 : 0.35),
  hLineColor: (index: number) => (index === 1 ? "#94a3b8" : "#dbe3ec"),
  vLineWidth: () => 0,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: (index: number) => (index === 0 ? 5 : 3),
  paddingBottom: (index: number) => (index === 0 ? 5 : 3),
};

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "�");
}

function widthsFor(section: Pick<AnalyticsPdfSection, "key" | "columns">): Array<string | number> {
  const widthsByKey: Partial<Record<AnalyticsExportSection["key"] | "methodology", Array<string | number>>> = {
    summary: ["16%", "18%", "11%", "*"],
    occupancy: ["22%", "12%", "12%", "*"],
    reportsByFacility: ["*", 100],
    reportsByCategory: ["*", 100],
    reportsByStatus: ["*", 100],
    facilityStatuses: ["22%", 58, "*"],
    methodology: ["21%", "*", "29%"],
  };
  const widths = widthsByKey[section.key];
  if (widths && widths.length === section.columns.length) return widths;
  return section.columns.map(() => "*");
}

function textCell(text: string, isHeader = false): ContentText {
  return {
    text: cleanText(text),
    fontSize: isHeader ? 7.5 : 7.25,
    bold: isHeader,
    color: isHeader ? "#0f172a" : "#1e293b",
    ...(isHeader ? { fillColor: "#e8eef5" } : {}),
    margin: [0, 1, 0, 1],
  };
}

function tableContent(
  section: AnalyticsPdfSection,
  rows: AnalyticsPdfSection["rows"],
): Content {
  const columns = section.columns.map((column) => cleanText(column));
  const bodyRows = rows.map((row) =>
    columns.map((_, index) => textCell(String(row[index] ?? ""))),
  );
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths: widthsFor(section),
      body: [columns.map((column) => textCell(column, true)), ...bodyRows],
    },
    layout: TABLE_LAYOUT,
  };
}

function sectionContent(section: AnalyticsPdfSection): Content[] {
  const rows = section.rows.length > 0
    ? section.rows
    : [[section.emptyMessage ?? "Tidak ada data", ...Array(Math.max(0, section.columns.length - 1)).fill("")]];
  const firstRows = rows.slice(0, 1);
  const remainingRows = rows.slice(1);
  const headingAndFirstRow: Content = {
    unbreakable: true,
    stack: [
      { text: cleanText(section.title), style: "sectionTitle", margin: [0, 12, 0, 4] },
      tableContent(section, firstRows),
    ],
  };

  return remainingRows.length > 0
    ? [headingAndFirstRow, tableContent(section, remainingRows)]
    : [headingAndFirstRow];
}

function methodologyContent(model: AnalyticsExportModel): Content[] {
  const rows = model.csvRows
    .filter(({ jenis_rekap }) => jenis_rekap === "METODOLOGI")
    .map(({ label, nilai, satuan, keterangan }) => [
      label,
      `${String(nilai)}${satuan ? ` ${satuan}` : ""}`,
      keterangan,
    ]);
  if (rows.length === 0) return [];

  const section: AnalyticsPdfSection = {
    key: "methodology",
    title: "Metodologi",
    columns: ["Aturan", "Nilai", "Keterangan"],
    rows,
  };
  return sectionContent(section);
}

export function buildAnalyticsPdfDefinition(model: AnalyticsExportModel): TDocumentDefinitions {
  const content: Content[] = [
    { text: "Rekap dashboard analitik", style: "documentTitle" },
    {
      text: `Periode ${model.metadata.startDate}–${model.metadata.endDate} · ${model.metadata.location} · dibuat ${model.metadata.createdAtWib}`,
      style: "metadata",
      margin: [0, 2, 0, 8],
    },
    ...(model.emptyMessage
      ? [{ text: cleanText(model.emptyMessage), style: "emptyNotice", margin: [0, 0, 0, 6] as [number, number, number, number] }]
      : []),
    ...model.sections.flatMap(sectionContent),
    ...methodologyContent(model),
  ];

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [30, 42, 30, 36],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      color: "#1e293b",
      lineHeight: 1.15,
    },
    styles: {
      documentTitle: {
        fontSize: 17,
        bold: true,
        color: "#0f172a",
      },
      metadata: {
        fontSize: 8,
        color: "#475569",
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: "#0f172a",
      },
      emptyNotice: {
        fontSize: 8,
        color: "#334155",
        fillColor: "#f1f5f9",
      },
    },
    header: (currentPage) =>
      currentPage === 1
        ? null
        : {
            text: `Ruvana · Rekap dashboard analitik · ${model.metadata.startDate}–${model.metadata.endDate}`,
            font: "Roboto",
            fontSize: 7,
            color: "#64748b",
            margin: [30, 15, 30, 0],
          },
    footer: (currentPage, pageCount) => ({
      text: `Halaman ${currentPage} dari ${pageCount}`,
      font: "Roboto",
      fontSize: 7,
      color: "#64748b",
      alignment: "right",
      margin: [30, 0, 30, 14],
    }),
    content,
    info: {
      title: "Rekap dashboard analitik Ruvana",
      subject: `Rekap ${model.metadata.startDate} hingga ${model.metadata.endDate}`,
      creator: "Ruvana",
    },
  };
}

export async function serializeAnalyticsPdf(model: AnalyticsExportModel): Promise<Buffer> {
  return pdfMake.createPdf(buildAnalyticsPdfDefinition(model)).getBuffer();
}
