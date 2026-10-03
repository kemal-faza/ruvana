import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ReportQueue } from "@/components/staff/report-queue";
import type { StaffReportResult } from "@/lib/services/report-processing-service";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom tidak mengimplementasikan <dialog>.showModal; stub membuka dialog
// sungguhan agar isi dan tombolnya bisa diuji.
beforeEach(() => {
  const buka = function buka(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  if (typeof HTMLDialogElement.prototype.showModal !== "function") {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      value: buka,
      configurable: true,
      writable: true,
    });
  } else {
    vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(buka);
  }
  if (typeof HTMLDialogElement.prototype.close !== "function") {
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      value: function tutup(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
      configurable: true,
      writable: true,
    });
  }
});

function laporan(overrides: Partial<StaffReportResult> = {}): StaffReportResult {
  return {
    id: 15,
    facility: {
      id: 1,
      nama: "RK-101",
      tipe: "ruang_kelas",
      lokasi: "Gedung A Lt.1",
      kapasitas: 40,
      deskripsi: "Ruang kelas standar ber-AC",
      status: "ACTIVE",
      statusChangedAt: null,
      statusChangedBy: null,
    },
    pelapor: {
      id: 42,
      nama: "Siti Aminah",
      email: "siti.aminah@example.com",
      role: "pengguna",
      status: "ACTIVE",
      waktuDaftar: "2026-09-01T02:00:00.000Z",
      waktuVerifikasi: "2026-09-02T04:00:00.000Z",
    },
    kategori: "Listrik",
    deskripsi: "Lampu sisi kanan tidak menyala.",
    foto: { hasPhoto: true, contentType: "image/png", size: 245_760 },
    status: "NEW",
    catatanResolusi: null,
    ditanganiOleh: null,
    createdAt: "2026-09-09T03:35:00.000Z",
    processedAt: null,
    ...overrides,
  };
}

function mockFetch(items: StaffReportResult[]) {
  const fetchMock = vi.fn(async (url: unknown) => {
    const target = String(url);
    if (/\/(start|resolve|reject)$/.test(target)) {
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items,
        meta: { page: 1, perPage: 20, totalItems: items.length, totalPages: 1 },
      }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ReportQueue", () => {
  it("meminta antrean sesuai jenis pekerjaan", async () => {
    const fetchMock = mockFetch([]);
    render(<ReportQueue queue="intake" urut="terlama" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain("queue=intake");

    cleanup();
    const fetchMockWork = mockFetch([]);
    render(<ReportQueue queue="work" urut="terlama" />);
    await waitFor(() => expect(fetchMockWork).toHaveBeenCalled());
    expect(fetchMockWork.mock.calls[0][0]).toContain("queue=work");

    cleanup();
    const fetchMockRiwayat = mockFetch([]);
    render(<ReportQueue queue="riwayat" urut="terlama" />);
    await waitFor(() => expect(fetchMockRiwayat).toHaveBeenCalled());
    expect(fetchMockRiwayat.mock.calls[0][0]).toContain("queue=riwayat");
  });

  it("meneruskan pilihan urutan ke antrean", async () => {
    const fetchMock = mockFetch([]);
    render(<ReportQueue queue="riwayat" urut="terbaru" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain("sort=terbaru");
  });

  it("menampilkan aksi mulai dan tolak untuk laporan baru", async () => {
    mockFetch([laporan()]);
    render(<ReportQueue queue="intake" urut="terlama" />);

    expect(await screen.findByText("Lampu sisi kanan tidak menyala.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mulai ditangani" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tolak laporan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tandai selesai" })).not.toBeInTheDocument();
  });

  it("menampilkan aksi selesai dan tolak untuk laporan yang sedang berjalan", async () => {
    mockFetch([laporan({ status: "IN_PROGRESS", ditanganiOleh: { id: 7, nama: "Petugas Ruvana", role: "petugas" } })]);
    render(<ReportQueue queue="work" urut="terlama" />);

    expect(await screen.findByRole("button", { name: "Tandai selesai" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mulai ditangani" })).not.toBeInTheDocument();
  });

  it("menyembunyikan seluruh aksi pada status terminal", async () => {
    mockFetch([laporan({ status: "RESOLVED", catatanResolusi: "Lampu diganti." })]);
    render(<ReportQueue queue="work" urut="terlama" />);

    expect(await screen.findByText("Catatan: Lampu diganti.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mulai ditangani" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tandai selesai" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tolak laporan" })).not.toBeInTheDocument();
  });

  it("menolak penyimpanan laporan tanpa catatan penyelesaian", async () => {
    const user = userEvent.setup();
    mockFetch([laporan({ status: "IN_PROGRESS" })]);
    render(<ReportQueue queue="work" urut="terlama" />);

    await user.click(await screen.findByRole("button", { name: "Tandai selesai" }));

    const dialog = await screen.findByRole("dialog", { name: "Selesaikan laporan" });
    expect(within(dialog).getByRole("button", { name: "Tandai selesai" })).toBeDisabled();
  });

  it("menjalankan transisi dengan catatan yang diisi", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch([laporan({ status: "IN_PROGRESS" })]);
    render(<ReportQueue queue="work" urut="terlama" />);

    await user.click(await screen.findByRole("button", { name: "Tandai selesai" }));
    const dialog = await screen.findByRole("dialog", { name: "Selesaikan laporan" });
    await user.type(within(dialog).getByLabelText("Catatan penyelesaian"), "Lampu diganti dan diuji.");
    await user.click(within(dialog).getByRole("button", { name: "Tandai selesai" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/reports/15/resolve",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const [, options] = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/resolve")) as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(options.body))).toEqual({ catatanResolusi: "Lampu diganti dan diuji." });
    expect((options.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();
  });

  it("menjelaskan keadaan kosong antrean", async () => {
    mockFetch([]);
    render(<ReportQueue queue="intake" urut="terlama" />);

    expect(await screen.findByText("Tidak ada laporan baru yang menunggu.")).toBeInTheDocument();
  });

  it("menjelaskan keadaan kosong riwayat tanpa aksi", async () => {
    mockFetch([]);
    render(<ReportQueue queue="riwayat" urut="terlama" />);

    expect(await screen.findByText("Belum ada laporan yang selesai atau ditolak.")).toBeInTheDocument();
  });

  it("menjelaskan akses ditolak", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response),
    );
    render(<ReportQueue queue="intake" urut="terlama" />);

    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
  });

  it("menjelaskan sesi berakhir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response),
    );
    render(<ReportQueue queue="intake" urut="terlama" />);

    expect(await screen.findByText("Masuk sebagai petugas")).toBeInTheDocument();
  });

  it("memenuhi pemeriksaan aksesibilitas", async () => {
    mockFetch([laporan()]);
    const { container } = render(<ReportQueue queue="intake" urut="terlama" />);
    await screen.findByText("Lampu sisi kanan tidak menyala.");

    expect((await axe(container)).violations).toEqual([]);
  });
});