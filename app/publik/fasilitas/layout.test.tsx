import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import PublicFacilityLayout from "@/app/publik/fasilitas/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

afterEach(() => {
  cleanup()
  resetMatchMedia()
})

describe("PublicFacilityLayout", () => {
  it("menampilkan header publik dan daftar fasilitas tanpa shell akun", () => {
    setMatchMedia("(max-width: 1023px)", false)

    render(<PublicFacilityLayout><p>Daftar fasilitas</p></PublicFacilityLayout>)

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getByRole("link", { name: "Fasilitas" })).toHaveAttribute("href", "/publik/fasilitas")
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.queryByRole("link", { name: "Reservasi" })).not.toBeInTheDocument()
    expect(screen.getByText("Daftar fasilitas")).toBeInTheDocument()
  })
})
