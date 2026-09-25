import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CSV_HEADERS,
  escapeSpreadsheetFormula,
  serializeAnalyticsCsv,
  type AnalyticsCsvRow,
} from "@/lib/exports/analytics-csv";

const row: AnalyticsCsvRow = {
  jenis_rekap: "LAPORAN_FASILITAS",
  dimensi: "fasilitas",
  label: "Ruang, \"Alfa\"",
  status: "",
  nilai: 3,
  satuan: "laporan",
  periode_mulai: "2026-09-01",
  periode_selesai: "2026-09-26",
  lokasi: "Gedung A",
  dibuat_pada_wib: "26-09-2026 09:00:00 WIB",
  keterangan: "Catatan, dengan koma",
};

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const text = source.replace(/^\uFEFF/u, "");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" && text[index + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
    } else {
      field += character;
    }
  }

  return rows;
}

describe("analytics CSV", () => {
  it("keeps the agreed machine-readable column order", () => {
    expect(ANALYTICS_CSV_HEADERS).toEqual([
      "jenis_rekap",
      "dimensi",
      "label",
      "status",
      "nilai",
      "satuan",
      "periode_mulai",
      "periode_selesai",
      "lokasi",
      "dibuat_pada_wib",
      "keterangan",
    ]);
  });

  it.each(["=1+1", "+SUM(A1:A2)", "-1+2", "@SUM(A1:A2)", "  =1+1", "\t=1+1", "\r=1+1"])(
    "makes formula-prefixed spreadsheet text inert: %j",
    (value) => {
      expect(escapeSpreadsheetFormula(value)).toBe(`'${value}`);
    },
  );

  it.each(["=1+1", "+SUM(A1:A2)", "-1+2", "@SUM(A1:A2)", "  =1+1", "\t=1+1", "\r=1+1"])(
    "serializes formula-prefixed labels as inert text: %j",
    (value) => {
      const csv = serializeAnalyticsCsv([{ ...row, label: value }]);
      const parsed = parseCsv(csv);
      const labelColumn = ANALYTICS_CSV_HEADERS.indexOf("label");

      expect(parsed[1]?.[labelColumn]).toBe(`'${value}`);
    },
  );

  it("does not change ordinary text or machine numeric values", () => {
    expect(escapeSpreadsheetFormula("Ruang Alfa")).toBe("Ruang Alfa");
    expect(serializeAnalyticsCsv([row])).toContain(",3,laporan,");
  });

  it("writes UTF-8 BOM, RFC 4180 quoting, and the exact logical row", () => {
    const csv = serializeAnalyticsCsv([row]);

    expect(csv.startsWith("\uFEFFjenis_rekap,dimensi,label,status,nilai,satuan,")).toBe(true);
    expect(csv).toContain('"Ruang, ""Alfa"""');
    expect(csv).toContain('"Catatan, dengan koma"');
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(parseCsv(csv)).toEqual([
      [...ANALYTICS_CSV_HEADERS],
      ANALYTICS_CSV_HEADERS.map((header) => String(row[header])),
    ]);
  });

  it("keeps a valid header-only CSV when there are no logical rows", () => {
    expect(serializeAnalyticsCsv([])).toBe(`\uFEFF${ANALYTICS_CSV_HEADERS.join(",")}\r\n`);
  });
});
