import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePetugasAtauAdmin, reportQueue } = vi.hoisted(() => ({
  requirePetugasAtauAdmin: vi.fn(),
  reportQueue: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePetugasAtauAdmin }));
vi.mock("@/components/staff/report-queue", () => ({
  ReportQueue: ({ queue, urut }: { queue: string; urut: string }) => {
    reportQueue(queue, urut);
    return null;
  },
}));

import LaporanPage from "@/app/petugas/laporan/page";

const petugas = {
  id: 7,
  nama: "Petugas Kampus",
  email: "petugas@ruvana.test",
  role: Role.petugas,
};

beforeEach(() => {
  vi.clearAllMocks();
  requirePetugasAtauAdmin.mockResolvedValue(petugas);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LaporanPage", () => {
  it("meneruskan redirect guard sebelum merender antrean", async () => {
    requirePetugasAtauAdmin.mockRejectedValue(new Error("redirect:/login"));

    await expect(LaporanPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/login");

    expect(requirePetugasAtauAdmin).toHaveBeenCalledOnce();
  });

  it("menampilkan tiga tab antrean beserta tautan urutannya", async () => {
    render(await LaporanPage({ searchParams: Promise.resolve({ queue: "riwayat" }) }));

    const tabAntrean = screen.getByRole("navigation", { name: "Pilih antrean laporan" });
    expect(tabAntrean).toHaveTextContent("Laporan masuk");
    expect(tabAntrean).toHaveTextContent("Daftar pekerjaan");
    expect(tabAntrean).toHaveTextContent("Riwayat");
    expect(screen.getByRole("link", { name: "Riwayat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Terlama dulu" })).toHaveAttribute("aria-current", "true");

    expect(reportQueue).toHaveBeenCalledWith("riwayat", "terlama");
  });

  it("mempertahankan antrean dan urutan saat tab lain dipilih", async () => {
    render(await LaporanPage({ searchParams: Promise.resolve({ queue: "riwayat", sort: "terbaru" }) }));

    expect(screen.getByRole("link", { name: "Laporan masuk" })).toHaveAttribute(
      "href",
      "/petugas/laporan?queue=intake&sort=terbaru",
    );
    expect(screen.getByRole("link", { name: "Terlama dulu" })).toHaveAttribute(
      "href",
      "/petugas/laporan?queue=riwayat",
    );

    expect(reportQueue).toHaveBeenCalledWith("riwayat", "terbaru");
  });

  it("memakai antrean masuk dan urutan terlama saat parameter tidak dikenal", async () => {
    render(await LaporanPage({ searchParams: Promise.resolve({ queue: "all", sort: "lama" }) }));

    expect(reportQueue).toHaveBeenCalledWith("intake", "terlama");
  });
});