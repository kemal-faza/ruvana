import { STATUS_FASILITAS } from "@/config/business";
import { LABEL_STATUS_FASILITAS } from "@/config/labels";
import type { AnalyticsCsvRow } from "@/lib/exports/analytics-csv";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

export type AnalyticsExportSnapshot = AnalyticsSnapshot;

export interface AnalyticsExportMetadata {
  startDate: string;
  endDate: string;
  location: string;
  createdAtIso: string;
  createdAtWib: string;
}

export type AnalyticsExportSectionKey =
  | "summary"
  | "occupancy"
  | "reportsByFacility"
  | "reportsByCategory"
  | "reportsByStatus"
  | "facilityStatuses";

export interface AnalyticsExportSection {
  key: AnalyticsExportSectionKey;
  title: string;
  columns: string[];
  rows: string[][];
  emptyMessage?: string;
}

export interface AnalyticsExportModel {
  metadata: AnalyticsExportMetadata;
  sections: AnalyticsExportSection[];
  csvRows: AnalyticsCsvRow[];
  isEmpty: boolean;
  emptyMessage: string | null;
}

const NO_REPORTS_MESSAGE = "Tidak ada laporan kerusakan yang cocok dengan filter ini.";
const NO_FACILITIES_MESSAGE = "Tidak ada fasilitas yang cocok dengan filter lokasi ini.";
const NO_DATA_MESSAGE = "Tidak ada data laporan atau fasilitas yang cocok dengan filter ini.";

function formatWib(date: Date): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.day}-${values.month}-${values.year} ${values.hour}:${values.minute}:${values.second} WIB`;
}

function roundOneDecimal(value: number): number {
  return Number(value.toFixed(1));
}

export function buildAnalyticsExportModel(
  snapshot: AnalyticsExportSnapshot,
): AnalyticsExportModel {
  const isEmpty = snapshot.reports.total === 0 && snapshot.occupancy.facilityCount === 0;
  const reportEmptyMessage = snapshot.reports.total === 0 ? NO_REPORTS_MESSAGE : undefined;
  const facilityEmptyMessage = snapshot.occupancy.facilityCount === 0 ? NO_FACILITIES_MESSAGE : undefined;
  const emptyMessage = isEmpty
    ? NO_DATA_MESSAGE
    : reportEmptyMessage ?? facilityEmptyMessage ?? null;
  const metadata: AnalyticsExportMetadata = {
    startDate: snapshot.filters.startDate,
    endDate: snapshot.filters.endDate,
    location: snapshot.filters.location ?? "Semua lokasi",
    createdAtIso: snapshot.metadata.generatedAt.toISOString(),
    createdAtWib: formatWib(snapshot.metadata.generatedAt),
  };

  const csvRow = (
    kind: AnalyticsCsvRow["jenis_rekap"],
    dimension: string,
    label: string,
    value: string | number,
    unit: string,
    note = "",
    status = "",
  ): AnalyticsCsvRow => ({
    jenis_rekap: kind,
    dimensi: dimension,
    label,
    status,
    nilai: value,
    satuan: unit,
    periode_mulai: metadata.startDate,
    periode_selesai: metadata.endDate,
    lokasi: metadata.location,
    dibuat_pada_wib: metadata.createdAtWib,
    keterangan: note,
  });

  const occupancyRows: AnalyticsCsvRow[] = [
    csvRow("OKUPANSI", "metrik", "Menit APPROVED", snapshot.occupancy.totalApprovedMinutes, "menit", snapshot.methodology.approvedStatusRule),
    csvRow("OKUPANSI", "metrik", "Fasilitas dalam kapasitas", snapshot.occupancy.facilityCount, "fasilitas", snapshot.methodology.capacityFormula),
    csvRow("OKUPANSI", "metrik", "Hari kalender inklusif", snapshot.occupancy.dayCount, "hari", snapshot.methodology.capacityFormula),
    csvRow("OKUPANSI", "metrik", "Kapasitas periode", snapshot.occupancy.capacityMinutes, "menit", snapshot.methodology.capacityFormula),
    csvRow(
      "OKUPANSI",
      "metrik",
      "Okupansi",
      snapshot.occupancy.occupancyPercent === null
        ? "Tidak dapat dihitung"
        : roundOneDecimal(snapshot.occupancy.occupancyPercent),
      "%",
      snapshot.occupancy.unavailableReason ?? snapshot.methodology.occupancyFormula,
    ),
  ];

  const reportTotalRows = [
    csvRow(
      "LAPORAN_TOTAL",
      "total",
      "Jumlah laporan",
      snapshot.reports.total,
      "laporan",
      reportEmptyMessage ?? "",
    ),
  ];
  const reportsByFacilityRows = snapshot.reports.byFacility.map(({ label, count }) =>
    csvRow("LAPORAN_FASILITAS", "fasilitas", label, count, "laporan"),
  );
  const reportsByCategoryRows = snapshot.reports.byCategory.map(({ label, count }) =>
    csvRow("LAPORAN_KATEGORI", "kategori", label, count, "laporan"),
  );
  const reportsByStatusRows = snapshot.reports.byStatus.map(({ label, count }) =>
    csvRow("LAPORAN_STATUS", "status", label, count, "laporan", "", label),
  );

  const facilityStatusRows: AnalyticsCsvRow[] = STATUS_FASILITAS.flatMap((status) => {
    const statusLabel = LABEL_STATUS_FASILITAS[status];
    const facilities = snapshot.facilityStatuses[status];
    return [
      csvRow(
        "STATUS_FASILITAS",
        "jumlah",
        statusLabel,
        facilities.length,
        "fasilitas",
        snapshot.methodology.facilityStatusNote,
        statusLabel,
      ),
      ...facilities.map((facilityName) =>
        csvRow("STATUS_FASILITAS", "fasilitas", facilityName, 1, "fasilitas", snapshot.methodology.facilityStatusNote, statusLabel),
      ),
    ];
  });

  const methodologyRows = [
    csvRow("METODOLOGI", "okupansi", "Zona waktu", snapshot.methodology.timezone, "", "Zona waktu kalender kampus."),
    csvRow("METODOLOGI", "okupansi", "Formula kapasitas", snapshot.methodology.capacityFormula, "", ""),
    csvRow("METODOLOGI", "okupansi", "Formula okupansi", snapshot.methodology.occupancyFormula, "", ""),
    csvRow("METODOLOGI", "okupansi", "Tanggal reservasi", snapshot.methodology.reservationDateRule, "", ""),
    csvRow("METODOLOGI", "okupansi", "Status pembilang", snapshot.methodology.approvedStatusRule, "", ""),
    csvRow("METODOLOGI", "laporan", "Tanggal laporan", snapshot.methodology.reportCreationDateRule, "", ""),
    csvRow("METODOLOGI", "status_fasilitas", "Status fasilitas", snapshot.methodology.facilityStatusNote, "", ""),
    ...(snapshot.reports.total === 0 || snapshot.occupancy.facilityCount === 0
      ? [csvRow("METODOLOGI", "data", "Keadaan data", emptyMessage ?? NO_REPORTS_MESSAGE, "", emptyMessage ?? NO_REPORTS_MESSAGE)]
      : []),
  ];

  const occupancySectionRows = occupancyRows.map(({ label, nilai, satuan, keterangan }) => [
    label,
    String(nilai),
    satuan,
    keterangan,
  ]);
  const reportRows = (
    rows: readonly AnalyticsCsvRow[],
    noData: string | undefined,
  ): string[][] =>
    rows.length > 0
      ? rows.map(({ label, nilai }) => [label, String(nilai)])
      : [[noData ?? "Tidak ada data", "0"]];

  const sections: AnalyticsExportSection[] = [
    {
      key: "summary",
      title: "Ringkasan",
      columns: ["Informasi", "Nilai", "Satuan", "Keterangan"],
      rows: [
        ["Periode", `${metadata.startDate} – ${metadata.endDate}`, "", snapshot.methodology.timezone],
        ["Lokasi", metadata.location, "", ""],
        ["Dibuat pada", metadata.createdAtWib, "", ""],
        ["Jumlah laporan", String(snapshot.reports.total), "laporan", reportEmptyMessage ?? ""],
        ["Zona waktu", snapshot.methodology.timezone, "", "Zona waktu kalender kampus."],
        ["Metodologi okupansi", snapshot.methodology.occupancyFormula, "", snapshot.methodology.capacityFormula],
        ["Tanggal reservasi", snapshot.methodology.reservationDateRule, "", ""],
        ["Status pembilang", snapshot.methodology.approvedStatusRule, "", ""],
        ["Metodologi tanggal laporan", snapshot.methodology.reportCreationDateRule, "", ""],
        ["Status fasilitas", snapshot.methodology.facilityStatusNote, "", ""],
        ...(emptyMessage ? [["Keadaan data", emptyMessage, "", ""]] : []),
      ],
    },
    {
      key: "occupancy",
      title: "Okupansi",
      columns: ["Metrik", "Nilai", "Satuan", "Keterangan"],
      rows: occupancySectionRows,
      ...(facilityEmptyMessage ? { emptyMessage: facilityEmptyMessage } : {}),
    },
    {
      key: "reportsByFacility",
      title: "Laporan per fasilitas",
      columns: ["Fasilitas", "Jumlah laporan"],
      rows: reportRows(reportsByFacilityRows, reportEmptyMessage),
      ...(reportEmptyMessage ? { emptyMessage: reportEmptyMessage } : {}),
    },
    {
      key: "reportsByCategory",
      title: "Laporan per kategori",
      columns: ["Kategori", "Jumlah laporan"],
      rows: reportRows(reportsByCategoryRows, reportEmptyMessage),
      ...(reportEmptyMessage ? { emptyMessage: reportEmptyMessage } : {}),
    },
    {
      key: "reportsByStatus",
      title: "Laporan per status",
      columns: ["Status laporan", "Jumlah laporan"],
      rows: reportRows(reportsByStatusRows, reportEmptyMessage),
      ...(reportEmptyMessage ? { emptyMessage: reportEmptyMessage } : {}),
    },
    {
      key: "facilityStatuses",
      title: "Status fasilitas saat ini",
      columns: ["Status fasilitas saat ini", "Jumlah", "Nama fasilitas"],
      rows: STATUS_FASILITAS.flatMap((status) => {
        const names = snapshot.facilityStatuses[status];
        return names.length > 0
          ? names.map((name) => [LABEL_STATUS_FASILITAS[status], String(names.length), name])
          : [[LABEL_STATUS_FASILITAS[status], "0", "Tidak ada fasilitas"]];
      }),
      ...(facilityEmptyMessage ? { emptyMessage: facilityEmptyMessage } : {}),
    },
  ];

  return {
    metadata,
    sections,
    csvRows: [
      ...occupancyRows,
      ...reportTotalRows,
      ...reportsByFacilityRows,
      ...reportsByCategoryRows,
      ...reportsByStatusRows,
      ...facilityStatusRows,
      ...methodologyRows,
    ],
    isEmpty,
    emptyMessage,
  };
}
