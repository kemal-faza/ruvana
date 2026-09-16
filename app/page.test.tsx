import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import Home from "@/app/page"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

afterEach(cleanup)

describe("katalog baseline UI", () => {
  it("menampilkan katalog Core 6 dan shell statis", () => {
    render(<Home />)

    expect(screen.getByRole("heading", { level: 1, name: "Baseline UI Ruvana" })).toBeInTheDocument()
    expect(screen.getByText("Pratinjau UI")).toBeInTheDocument()

    for (const name of ["Button", "Field", "Card", "Badge", "Skeleton", "Empty state"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument()
    }

    for (const name of ["Ringkasan", "Reservasi", "Fasilitas", "Laporan", "Pengaturan"]) {
      expect(screen.getAllByRole("link", { name }).length).toBeGreaterThan(0)
    }

    const input = screen.getByRole("textbox", { name: /nama contoh/i })
    expect(input).toBeRequired()
    expect(input).toHaveAttribute("aria-describedby", "contoh-nama-help contoh-nama-error")
    expect(screen.getByText("Contoh pemuatan")).toBeInTheDocument()
    expect(screen.getByText("Menunggu")).toBeInTheDocument()
    expect(screen.getByText("Tidak ada contoh untuk ditampilkan.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tambah contoh" })).toBeInTheDocument()
  })

  it("tidak menyisipkan data domain, statistik, atau kontrol peran", () => {
    render(<Home />)

    for (const text of [
      "Ruang Sidang",
      "Aula Utama",
      "Budi Santoso",
      "08.00",
      "Kapasitas",
      "Setujui reservasi",
      "12 reservasi",
    ]) {
      expect(screen.queryByText(text, { exact: false })).not.toBeInTheDocument()
    }

    expect(screen.queryByRole("button", { name: /admin|pengguna|ganti peran/i })).not.toBeInTheDocument()
  })
})
