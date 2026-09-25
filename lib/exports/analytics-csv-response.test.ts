import { describe, expect, it } from "vitest";

import { serializeAnalyticsCsv, type AnalyticsCsvRow } from "@/lib/exports/analytics-csv";
import { createAnalyticsCsvResponse } from "@/lib/exports/analytics-csv-response";
import type { AnalyticsExportModel } from "@/lib/exports/analytics-export-model";

const csvRow: AnalyticsCsvRow = {
  jenis_rekap: "LAPORAN_TOTAL",
  dimensi: "total",
  label: "Jumlah laporan",
  status: "",
  nilai: 0,
  satuan: "laporan",
  periode_mulai: "2026-09-01",
  periode_selesai: "2026-09-26",
  lokasi: "Semua lokasi",
  dibuat_pada_wib: "26-09-2026 09:00:00 WIB",
  keterangan: "Tidak ada laporan yang cocok.",
};

const model: AnalyticsExportModel = {
  metadata: {
    startDate: "2026-09-01",
    endDate: "2026-09-26",
    location: "Semua lokasi",
    createdAtIso: "2026-09-26T02:00:00.000Z",
    createdAtWib: "26-09-2026 09:00:00 WIB",
  },
  sections: [],
  csvRows: [csvRow],
  isEmpty: true,
  emptyMessage: "Tidak ada data yang cocok.",
};

describe("analytics CSV response", () => {
  it("returns an uncached UTF-8 attachment using the same serialized rows", async () => {
    const response = createAnalyticsCsvResponse(model);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="analitik-2026-09-01-2026-09-26.csv"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(serializeAnalyticsCsv([csvRow]));
  });
});
