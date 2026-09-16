import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SiteHeader } from "@/components/site/site-header"

afterEach(cleanup)

describe("SiteHeader", () => {
  it("merender wordmark RUVANA dengan brand mark dekoratif", () => {
    render(<SiteHeader />)

    const brand = screen.getByRole("link", { name: "Ruvana — beranda" })
    expect(brand).toHaveTextContent("RUVANA")
    expect(brand.querySelector("span[aria-hidden='true']")).not.toBeNull()
  })

  it("menautkan navigasi utama ke rute dan anchor jadwal", () => {
    render(<SiteHeader />)

    const nav = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(nav.querySelector("a[href='/']")).toHaveTextContent("Beranda")
    expect(nav.querySelector("a[href='/fasilitas']")).toHaveTextContent("Fasilitas")
    expect(nav.querySelector("a[href='#jadwal']")).toHaveTextContent("Jadwal")
  })

  it("menandai lokasi aktif hanya pada item yang cocok", () => {
    render(<SiteHeader current="beranda" />)

    const nav = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(nav.querySelector("a[href='/']")).toHaveAttribute("aria-current", "page")
    expect(nav.querySelector("a[href='/fasilitas']")).not.toHaveAttribute("aria-current")
    expect(nav.querySelector("a[href='#jadwal']")).not.toHaveAttribute("aria-current")
  })

  it("menempatkan pengalih tema, Masuk, dan Daftar di aksi header", () => {
    const { container } = render(<SiteHeader />)

    const header = container.querySelector("header")
    expect(header).not.toBeNull()
    expect(header?.querySelector("button[aria-label^='Gunakan tema']")).not.toBeNull()
    expect(header?.querySelector("a[href='/masuk']")).toHaveTextContent("Masuk")
    expect(header?.querySelector("a[href='/daftar']")).toHaveTextContent("Daftar")
  })
})
