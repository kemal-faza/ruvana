import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { ReportSortSelect } from "@/components/staff/report-sort-select";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe("ReportSortSelect", () => {
  it("menampilkan satu dropdown dengan urutan bawaan terlama", () => {
    render(<ReportSortSelect queue="intake" urut="terlama" />);

    const urutan = screen.getByRole("combobox", { name: "Urutkan antrean laporan" });
    expect(urutan).toHaveTextContent("Terlama");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Urutkan")).toBeInTheDocument();
  });

  it("menampilkan kedua opsi urutan saat dropdown dibuka", async () => {
    const user = userEvent.setup();
    render(<ReportSortSelect queue="intake" urut="terlama" />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Urutkan antrean laporan" }));

    const opsi = await screen.findAllByRole("option");
    expect(opsi.map((item) => item.textContent)).toEqual(["Terlama", "Terbaru"]);
  });

  it("membuka daftar lalu mengirim param sort terbaru ke URL", async () => {
    const user = userEvent.setup();
    render(<ReportSortSelect queue="riwayat" urut="terlama" />);

    await user.click(screen.getByRole("combobox", { name: "Urutkan antrean laporan" }));
    await user.click(await screen.findByRole("option", { name: "Terbaru" }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/petugas/laporan?queue=riwayat&sort=terbaru", {
      scroll: false,
    });
  });

  it("mempertahankan antrean dan mengelola urutan lewat keyboard", async () => {
    const user = userEvent.setup();
    render(<ReportSortSelect queue="work" urut="terbaru" />);

    const urutan = screen.getByRole("combobox", { name: "Urutkan antrean laporan" });
    expect(urutan).toHaveTextContent("Terbaru");

    urutan.focus();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Home}{Enter}");

    // Urutan bawaan tidak memakai `sort` pada URL.
    expect(replaceMock).toHaveBeenCalledWith("/petugas/laporan?queue=work", { scroll: false });
  });

  it("tidak menavigasi ulang saat opsi aktif dipilih ulang", async () => {
    const user = userEvent.setup();
    render(<ReportSortSelect queue="intake" urut="terlama" />);

    await user.click(screen.getByRole("combobox", { name: "Urutkan antrean laporan" }));
    await user.click(await screen.findByRole("option", { name: "Terlama" }));

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("lolos pemeriksaan aksesibilitas otomatis", async () => {
    const { container } = render(<ReportSortSelect queue="intake" urut="terlama" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});