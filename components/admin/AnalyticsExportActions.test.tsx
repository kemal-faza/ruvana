import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsExportActions from "@/components/admin/AnalyticsExportActions";

const filters = { startDate: "2026-09-01", endDate: "2026-09-26", location: "Kampus Utama" };
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

describe("AnalyticsExportActions", () => {
  const fetchMock = vi.fn();
  const createObjectUrlMock = vi.fn(() => "blob:analitik");
  const revokeObjectUrlMock = vi.fn();
  const anchorClickMock = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrlMock });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrlMock });
    fetchMock.mockReset();
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    anchorClickMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    if (originalCreateObjectURL) Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
    else Reflect.deleteProperty(URL, "createObjectURL");
    if (originalRevokeObjectURL) Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
    else Reflect.deleteProperty(URL, "revokeObjectURL");
  });

  it("keeps one download in flight and sends the selected canonical filters", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveResponse = resolve; }));

    render(<AnalyticsExportActions filters={filters} />);
    const csvButton = screen.getByRole("button", { name: "Unduh CSV" });
    fireEvent.click(csvButton);

    expect(csvButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unduh XLSX" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Menyiapkan berkas CSV");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/analitik/ekspor/csv?startDate=2026-09-01&endDate=2026-09-26&location=Kampus+Utama",
      { credentials: "same-origin" },
    );

    resolveResponse(new Response("csv", { headers: { "Content-Disposition": 'attachment; filename="rekap.csv"' } }));
    await waitFor(() => expect(anchorClickMock).toHaveBeenCalledOnce());
    expect(createObjectUrlMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Unduh CSV" })).toBeEnabled();
  });

  it("shows an actionable error and allows retry after a failed response", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response("xlsx", { headers: { "Content-Disposition": 'attachment; filename="rekap.xlsx"' } }));
    render(<AnalyticsExportActions filters={{ ...filters, location: "" }} />);

    const xlsxButton = screen.getByRole("button", { name: "Unduh XLSX" });
    fireEvent.click(xlsxButton);
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal mengunduh berkas XLSX");
    expect(xlsxButton).toBeEnabled();
    fireEvent.click(xlsxButton);

    await waitFor(() => expect(anchorClickMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/admin/analitik/ekspor/xlsx?startDate=2026-09-01&endDate=2026-09-26",
      { credentials: "same-origin" },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
