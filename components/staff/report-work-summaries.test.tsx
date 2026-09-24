import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportWorkSummaries } from "@/components/staff/report-work-summaries";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const response = {
  NEW: {
    total: 4,
    items: [{ id: 11, facilityNama: "Gedung A", kategori: "Listrik", deskripsi: "Lampu mati", status: "NEW", createdAt: "2026-09-24T03:00:00.000Z" }],
  },
  IN_PROGRESS: {
    total: 2,
    items: [{ id: 12, facilityNama: "Gedung B", kategori: "Air", deskripsi: "Keran bocor", status: "IN_PROGRESS", createdAt: "2026-09-24T04:00:00.000Z" }],
  },
};

describe("ringkasan pekerjaan laporan Petugas", () => {
  it("memisahkan jumlah, status, pratinjau, dan tujuan kerja", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    render(<ReportWorkSummaries />);

    expect(await screen.findByText("Gedung A")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Laporan baru" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sedang dikerjakan" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Baru")).toBeInTheDocument();
    expect(screen.getByText("Diproses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat laporan baru" })).toHaveAttribute(
      "href",
      "/petugas/laporan?status=NEW",
    );
    expect(screen.getByRole("link", { name: "Lihat pekerjaan berjalan" })).toHaveAttribute(
      "href",
      "/petugas/laporan?status=IN_PROGRESS",
    );
  });

  it("menampilkan loading lalu keadaan kosong untuk kedua status", async () => {
    let resolveResponse: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveResponse = resolve; })));
    render(<ReportWorkSummaries />);

    expect(screen.getAllByRole("status")).toHaveLength(2);
    resolveResponse?.({
      ok: true,
      json: async () => ({ NEW: { total: 0, items: [] }, IN_PROGRESS: { total: 0, items: [] } }),
    });

    expect(await screen.findByText("Belum ada laporan baru.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada laporan yang sedang dikerjakan.")).toBeInTheDocument();
  });

  it("menampilkan error dan dapat memuat ulang", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Jaringan gagal"))
      .mockResolvedValueOnce({ ok: true, json: async () => response });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReportWorkSummaries />);

    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.queryByText("Belum ada laporan baru.")).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Coba lagi" })[0]);

    expect(await screen.findByText("Gedung A")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
