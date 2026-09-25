import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadAuthorizedAnalyticsExport: vi.fn(),
  serializeAnalyticsXlsx: vi.fn(),
}));

vi.mock("@/lib/exports/analytics-export-loader", () => ({
  loadAuthorizedAnalyticsExport: mocks.loadAuthorizedAnalyticsExport,
}));
vi.mock("@/lib/exports/analytics-xlsx", () => ({
  serializeAnalyticsXlsx: mocks.serializeAnalyticsXlsx,
}));

import { GET, runtime } from "@/app/api/admin/analitik/ekspor/xlsx/route";
import type { AnalyticsExportModel } from "@/lib/exports/analytics-export-model";

const model = {
  metadata: {
    startDate: "2026-09-01",
    endDate: "2026-09-26",
    location: "Semua lokasi",
    createdAtIso: "2026-09-26T02:00:00.000Z",
    createdAtWib: "26-09-2026 09:00:00 WIB",
  },
  sections: [],
  csvRows: [],
  isEmpty: false,
  emptyMessage: null,
} satisfies AnalyticsExportModel;

describe("XLSX export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs in Node and returns an uncached workbook attachment from the authorized model", async () => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    mocks.loadAuthorizedAnalyticsExport.mockResolvedValue({ ok: true, model });
    mocks.serializeAnalyticsXlsx.mockResolvedValue(bytes);

    const request = new Request("http://localhost/api/admin/analitik/ekspor/xlsx?startDate=2026-09-01");
    const response = await GET(request);

    expect(runtime).toBe("nodejs");
    expect(mocks.loadAuthorizedAnalyticsExport).toHaveBeenCalledWith(request);
    expect(mocks.serializeAnalyticsXlsx).toHaveBeenCalledWith(model);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="analitik-2026-09-01-2026-09-26.xlsx"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));
  });

  it("passes authorization or filter failures through without generating a workbook", async () => {
    const denied = new Response("Forbidden", { status: 403 });
    mocks.loadAuthorizedAnalyticsExport.mockResolvedValue({ ok: false, response: denied });

    const response = await GET(new Request("http://localhost/api/admin/analitik/ekspor/xlsx"));

    expect(response).toBe(denied);
    expect(mocks.serializeAnalyticsXlsx).not.toHaveBeenCalled();
  });
});
