import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { ReservationSuccessBanner } from "@/components/reservation/reservation-success-banner"

const replaceMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ReservationSuccessBanner", () => {
  it("menampilkan judul, status Menunggu, penjelasan, dan tautan riwayat", () => {
    render(<ReservationSuccessBanner />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Reservasi berhasil diajukan" })).toBeInTheDocument()
    expect(screen.getByText("Menunggu")).toBeInTheDocument()
    expect(screen.getByText(/Petugas akan meninjau/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Lihat riwayat reservasi" })).toHaveAttribute(
      "href",
      "/reservasi/riwayat",
    )
  })

  it("memindahkan fokus ke banner saat tampil", () => {
    render(<ReservationSuccessBanner />)

    expect(screen.getByRole("status")).toHaveFocus()
  })

  it("tombol tutup menghapus banner dari tampilan", async () => {
    const user = userEvent.setup()
    render(<ReservationSuccessBanner />)

    await user.click(screen.getByRole("button", { name: "Tutup pemberitahuan" }))

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("lolos pemeriksaan aksesibilitas", async () => {
    const { container } = render(<ReservationSuccessBanner />)

    expect((await axe(container)).violations).toEqual([])
  })
})
