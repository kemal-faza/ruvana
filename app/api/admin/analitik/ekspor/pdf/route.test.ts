import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsExportModel } from "@/lib/exports/analytics-export-model";

const mocks = vi.hoisted(() => ({
  loadAuthorizedAnalyticsExport: vi.fn(),
  serializeAnalyticsPdf: vi.fn(),
}));

vi.mock("@/lib/exports/analytics-export-loader", () => ({
  loadAuthorizedAnalyticsExport: mocks.loadAuthorizedAnalyticsExport,
}));

vi.mock("@/lib/exports/analytics-pdf", () => ({
  serializeAnalyticsPdf: mocks.serializeAnalyticsPdf,
}));

import { GET } from "./route";

const model = {
  metadata: {
    startDate: "2026-09-01",
    endDate: "2026-09-26",
    location: "Kampus Depok",
    createdAtIso: "2026-09-26T02:00:00.000Z",
    createdAtWib: "26-09-2026 09:00:00 WIB",
  },
} as AnalyticsExportModel;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/analitik/ekspor/pdf", () => {
  it("mengembalikan PDF lampiran tanpa cache untuk snapshot admin", async () => {
    const pdf = Buffer.from("%PDF-1.7\nfixture\n%%EOF");
    mocks.loadAuthorizedAnalyticsExport.mockResolvedValue({ ok: true, model });
    mocks.serializeAnalyticsPdf.mockResolvedValue(pdf);

    const response = await GET(new Request("http://localhost/api/admin/analitik/ekspor/pdf?startDate=2026-09-01"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="analitik-2026-09-01-2026-09-26.pdf"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
    expect(mocks.serializeAnalyticsPdf).toHaveBeenCalledWith(model);
  });

  it("meneruskan penolakan loader dan tidak membangkitkan data PDF", async () => {
    const denied = new Response("akses ditolak", { status: 403 });
    mocks.loadAuthorizedAnalyticsExport.mockResolvedValue({ ok: false, response: denied });

    const response = await GET(new Request("http://localhost/api/admin/analitik/ekspor/pdf"));

    expect(response).toBe(denied);
    expect(mocks.serializeAnalyticsPdf).not.toHaveBeenCalled();
  });

  it("mengubah kegagalan generator menjadi problem 500 tanpa rincian internal", async () => {
    mocks.loadAuthorizedAnalyticsExport.mockResolvedValue({ ok: true, model });
    mocks.serializeAnalyticsPdf.mockRejectedValue(new Error("fixture internal"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(new Request("http://localhost/api/admin/analitik/ekspor/pdf"));

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(await response.text()).not.toContain("fixture internal");
    consoleError.mockRestore();
  });
});
