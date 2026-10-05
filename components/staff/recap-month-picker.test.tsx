import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

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

async function pilihBulan(user: ReturnType<typeof userEvent.setup>, nilai: string) {
  const [tahun, bulan] = nilai.split("-");
  const labelBulan = format(new Date(2020, Number(bulan) - 1, 1), "LLLL", { locale: localeId });
  await user.click(screen.getByLabelText("Bulan"));
  await user.click(await screen.findByRole("option", { name: labelBulan }));
  fireEvent.change(screen.getByLabelText("Tahun"), { target: { value: tahun } });
}

describe("RecapMonthPicker", () => {
  it("memilih bulan memanggil replace dengan param benar", async () => {
    const user = userEvent.setup();
    render(<RecapMonthPicker currentMonth="2026-09" />);

    await pilihBulan(user, "2026-10");
    await user.click(screen.getByRole("button", { name: "Tampilkan rekap" }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/petugas?bulan=2026-10", { scroll: false });
  });

  it("menampilkan penanda pending dan mencegah dobel-submit sampai data baru tiba", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RecapMonthPicker currentMonth="2026-09" />);

    await pilihBulan(user, "2026-10");
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

  it("menampilkan nama bulan dalam Bahasa Indonesia", async () => {
    const user = userEvent.setup();
    render(<RecapMonthPicker currentMonth="2026-09" />);

    expect(screen.getByLabelText("Bulan")).toHaveTextContent("September");
    await user.click(screen.getByLabelText("Bulan"));
    expect(await screen.findByRole("option", { name: "Oktober" })).toBeInTheDocument();
  });

  it("mengirim nilai bulan dan tahun lewat form GET native", () => {
    render(<RecapMonthPicker currentMonth="2026-09" />);

    const form = screen.getByRole("form", { name: "Pilih bulan rekap" });
    expect(form).toHaveAttribute("action", "/petugas");
    expect(form).toHaveAttribute("method", "get");

    const pemicuBulan = screen.getByLabelText("Bulan");
    expect(pemicuBulan).toHaveAttribute("id", "rekap-bulan");
    expect(pemicuBulan).toHaveClass("min-h-11");
    const masukanBulan = form.querySelector<HTMLInputElement>('input[name="bulan"]');
    expect(masukanBulan).not.toBeNull();
    expect(masukanBulan?.value).toBe("09");

    const masukanTahun = screen.getByLabelText("Tahun");
    expect(masukanTahun).toHaveAttribute("name", "tahun");
    expect(masukanTahun).toHaveValue(2026);
    expect(masukanTahun).toHaveClass("min-h-11");

    const formElement = form as HTMLFormElement;
    expect(new FormData(formElement).get("bulan")).toBe("09");
    expect(new FormData(formElement).get("tahun")).toBe("2026");
  });

  it("lolos pemeriksaan aksesibilitas otomatis", async () => {
    const { container } = render(<RecapMonthPicker currentMonth="2026-09" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
