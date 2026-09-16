import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SiteFooter } from "@/components/site/site-footer"

afterEach(cleanup)

describe("SiteFooter", () => {
  it("memakai nama aksesibel wordmark yang berbeda dari header", () => {
    render(<SiteFooter />)

    const brand = screen.getByRole("link", { name: "Ruvana — beranda, footer" })
    expect(brand).toHaveTextContent("ruvana")
    expect(brand.querySelector("span[aria-hidden='true']")).toBeNull()
    expect(screen.queryByRole("link", { name: "Ruvana — beranda" })).toBeNull()
  })

  it("menautkan navigasi footer ke rute dan anchor", () => {
    render(<SiteFooter />)

    const nav = screen.getByRole("navigation", { name: "Navigasi footer" })
    const expected = [
      ["/", "Beranda"],
      ["/fasilitas", "Fasilitas"],
      ["#jadwal", "Jadwal"],
      ["/kebijakan-privasi", "Kebijakan Privasi"],
      ["/syarat-ketentuan", "Syarat & Ketentuan"],
    ] as const

    for (const [href, label] of expected) {
      expect(nav.querySelector(`a[href='${href}']`)).toHaveTextContent(label)
    }
  })

  it("mencantumkan atribusi foto dan tagline", () => {
    render(<SiteFooter />)

    expect(screen.getByText("Ruang bersama, kegiatan lebih bermakna.")).toBeVisible()
    expect(screen.getByText("Foto: Unsplash")).toBeVisible()
  })
})
