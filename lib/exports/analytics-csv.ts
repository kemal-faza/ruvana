export const ANALYTICS_CSV_HEADERS = [
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
] as const;

export type AnalyticsRecapKind =
  | "OKUPANSI"
  | "LAPORAN_TOTAL"
  | "LAPORAN_FASILITAS"
  | "LAPORAN_KATEGORI"
  | "LAPORAN_STATUS"
  | "STATUS_FASILITAS"
  | "METODOLOGI";

export interface AnalyticsCsvRow {
  jenis_rekap: AnalyticsRecapKind;
  dimensi: string;
  label: string;
  status: string;
  nilai: string | number;
  satuan: string;
  periode_mulai: string;
  periode_selesai: string;
  lokasi: string;
  dibuat_pada_wib: string;
  keterangan: string;
}

/** Prefixes spreadsheet-formula-like text so CSV import treats it as inert text. */
export function escapeSpreadsheetFormula(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
}

function csvField(value: string | number): string {
  const text = typeof value === "number" ? String(value) : escapeSpreadsheetFormula(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Serialize fixed-schema CSV with a UTF-8 BOM for spreadsheet compatibility. */
export function serializeAnalyticsCsv(rows: readonly AnalyticsCsvRow[]): string {
  const header = ANALYTICS_CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.jenis_rekap,
      row.dimensi,
      row.label,
      row.status,
      row.nilai,
      row.satuan,
      row.periode_mulai,
      row.periode_selesai,
      row.lokasi,
      row.dibuat_pada_wib,
      row.keterangan,
    ]
      .map(csvField)
      .join(","),
  );

  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}
