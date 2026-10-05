import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SiteHeader } from "@/components/site/site-header"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

afterEach(() => {
  cleanup()
  resetMatchMedia()
})

describe("SiteHeader", () => {
  it("menautkan navigasi utama ke tujuan yang tetap valid di halaman discovery", () => {
    setMatchMedia("(max-width: 1023px)", false)
    render(<SiteHeader current="fasilitas" />)

    const nav = screen.getByRole("navigation", { name: "Navigasi utama" })
    const expected = [
      ["/", "Beranda"],
      ["/publik/fasilitas", "Fasilitas"],
      ["/#jadwal", "Jadwal"],
    ] as const

    for (const [href, label] of expected) {
      expect(nav.querySelector(`a[href='${href}']`)).toHaveTextContent(label)
    }
  })

  it("menandai hanya seksi yang sedang dibuka sebagai halaman aktif", () => {
    setMatchMedia("(max-width: 1023px)", false)
    render(<SiteHeader current="fasilitas" />)

    const nav = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(nav).getByRole("link", { name: "Fasilitas" })).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: "Beranda" })).not.toHaveAttribute("aria-current")
    expect(within(nav).getByRole("link", { name: "Jadwal" })).not.toHaveAttribute("aria-current")
  })

  it("menyediakan aksi masuk dan daftar bagi pengunjung", () => {
    setMatchMedia("(max-width: 1023px)", false)
    render(<SiteHeader />)

    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Daftar" })).toHaveAttribute("href", "/daftar")
  })
})
