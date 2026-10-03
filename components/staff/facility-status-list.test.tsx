import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FacilityStatusList } from "@/components/staff/facility-status-list";
import type { StaffFacility } from "@/lib/services/facility-service";

const { routerRefresh } = vi.hoisted(() => ({ routerRefresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fasilitas(overrides: Partial<StaffFacility> = {}): StaffFacility {
  return {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: "Ruang kelas standar",
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedBy: null,
    ...overrides,
  };
}

// jsdom tidak mengimplementasikan <dialog>.showModal; stub membuka dialog
// sungguhan agar isi dan tombolnya bisa diuji.
function mockFetch(hasil: { ok?: boolean; status?: number; body?: unknown } = {}) {
  const fetchMock = vi.fn(async () => {
    return {
      ok: hasil.ok ?? true,
      status: hasil.status ?? 200,
      json: async () => hasil.body ?? {},
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
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
  } else {
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function tutup(this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  }
  return fetchMock;
}

describe("FacilityStatusList", () => {
  it("menampilkan status, lokasi, kapasitas, dan provenance", () => {
    mockFetch();
    render(
      <FacilityStatusList
        facilities={[
          fasilitas({
            status: "UNDER_MAINTENANCE",
            statusChangedAt: "2026-10-03T05:00:00.000Z",
            statusChangedBy: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/RK-101/)).toBeInTheDocument();
    expect(screen.getByText("Gedung A Lt.1")).toBeInTheDocument();
    expect(screen.getByText("Kapasitas 40 orang")).toBeInTheDocument();
    expect(screen.getByText(/Diubah oleh Petugas Ruvana/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kembalikan tersedia" })).toBeInTheDocument();
  });

  it("menjelaskan keadaan kosong saat belum ada fasilitas", () => {
    mockFetch();
    render(<FacilityStatusList facilities={[]} />);

    expect(screen.getByText("Belum ada fasilitas")).toBeInTheDocument();
  });

  it("menampilkan dampak perubahan sebelum konfirmasi", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch();
    render(<FacilityStatusList facilities={[fasilitas()]} />);

    await user.click(screen.getByRole("button", { name: "Tandai pemeliharaan" }));

    const dialog = await screen.findByRole("dialog", { name: "Tandai pemeliharaan" });
    expect(within(dialog).getByText(/dibatalkan otomatis/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengirim PATCH dengan Idempotency-Key lalu memperbarui status", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      body: {
        id: 1,
        nama: "RK-101",
        tipe: "ruang_kelas",
        lokasi: "Gedung A Lt.1",
        kapasitas: 40,
        deskripsi: "Ruang kelas standar",
        status: "UNDER_MAINTENANCE",
        statusChangedAt: "2026-10-03T05:00:00.000Z",
        statusChangedBy: { id: 7, nama: "Petugas Ruvana", role: "petugas" },
      },
    });
    render(<FacilityStatusList facilities={[fasilitas()]} />);

    await user.click(screen.getByRole("button", { name: "Tandai pemeliharaan" }));
    const dialog = await screen.findByRole("dialog", { name: "Tandai pemeliharaan" });
    await user.click(within(dialog).getByRole("button", { name: "Tandai pemeliharaan" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/staff/facilities/1/status");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(String(options.body))).toEqual({ status: "UNDER_MAINTENANCE" });
    expect((options.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();

    expect(await screen.findByText("Dalam Pemeliharaan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kembalikan tersedia" })).toBeInTheDocument();
    expect(screen.getByText(/dibatalkan otomatis/)).toBeInTheDocument();
    // FAC-04: UI yang melakukan mutasi me-refetch data server.
    expect(routerRefresh).toHaveBeenCalledOnce();
  });

  it("menjelaskan penolakan transisi dari server", async () => {
    const user = userEvent.setup();
    mockFetch({
      ok: false,
      status: 409,
      body: { detail: "Transisi status fasilitas tidak diizinkan dari status saat ini." },
    });
    render(<FacilityStatusList facilities={[fasilitas()]} />);

    await user.click(screen.getByRole("button", { name: "Tandai pemeliharaan" }));
    const dialog = await screen.findByRole("dialog", { name: "Tandai pemeliharaan" });
    await user.click(within(dialog).getByRole("button", { name: "Tandai pemeliharaan" }));

    expect(
      await screen.findByText("Transisi status fasilitas tidak diizinkan dari status saat ini."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tandai pemeliharaan" })).toBeInTheDocument();
  });

  it("menyembunyikan aksi untuk fasilitas nonaktif dan menjelaskan kewenangan admin", () => {
    mockFetch();
    render(<FacilityStatusList facilities={[fasilitas({ status: "INACTIVE" })]} />);

    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pemeliharaan|tersedia/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Hanya admin yang dapat mengaktifkannya kembali/)).toBeInTheDocument();
  });

  it("memberi target sentuh yang cukup pada setiap aksi", () => {
    mockFetch();
    render(<FacilityStatusList facilities={[fasilitas()]} />);

    expect(screen.getByRole("button", { name: "Tandai pemeliharaan" }).className).toContain("min-h-11");
  });

  it("memenuhi pemeriksaan aksesibilitas", async () => {
    mockFetch();
    const { container } = render(<FacilityStatusList facilities={[fasilitas()]} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
