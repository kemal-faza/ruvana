import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { RecapMonthPicker } from "@/components/staff/recap-month-picker";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

function pilihBulan(nilai: string) {
  fireEvent.change(screen.getByLabelText("Bulan"), { target: { value: nilai } });
}

describe("RecapMonthPicker", () => {
  it("memilih bulan memanggil replace dengan param benar", async () => {
    const user = userEvent.setup();
    render(<RecapMonthPicker currentMonth="2026-09" />);

    pilihBulan("2026-10");
    await user.click(screen.getByRole("button", { name: "Tampilkan rekap" }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/petugas?bulan=2026-10", { scroll: false });
  });

  it("menampilkan penanda pending dan mencegah dobel-submit sampai data baru tiba", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecapMonthPicker currentMonth="2026-09" />);

    pilihBulan("2026-10");
    await user.click(screen.getByRole("button", { name: "Tampilkan rekap" }));

    const form = screen.getByRole("form", { name: "Pilih bulan rekap" });
    expect(form).toHaveAttribute("aria-busy", "true");
    const tombol = screen.getByRole("button", { name: "Tampilkan rekap" });
    expect(tombol).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Memuat rekap…");

    await user.click(tombol);
    expect(replaceMock).toHaveBeenCalledTimes(1);

    rerender(<RecapMonthPicker currentMonth="2026-10" />);
    expect(screen.getByRole("button", { name: "Tampilkan rekap" })).not.toBeDisabled();
    expect(screen.getByRole("form", { name: "Pilih bulan rekap" })).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("tetap berfungsi tanpa JavaScript lewat form GET native", () => {
    render(<RecapMonthPicker currentMonth="2026-09" />);

    const form = screen.getByRole("form", { name: "Pilih bulan rekap" });
    expect(form).toHaveAttribute("action", "/petugas");
    expect(form).toHaveAttribute("method", "get");
    const masukan = screen.getByLabelText("Bulan");
    expect(masukan).toHaveAttribute("type", "month");
    expect(masukan).toHaveAttribute("name", "bulan");
    expect(masukan).toHaveValue("2026-09");
  });

  it("lolos pemeriksaan aksesibilitas otomatis", async () => {
    const { container } = render(<RecapMonthPicker currentMonth="2026-09" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
