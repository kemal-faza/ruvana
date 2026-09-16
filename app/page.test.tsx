import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import Home from "@/app/page"
import { TIPE_FASILITAS_LABEL } from "@/config/business"

vi.mock("next/font/google", () => ({
  Poppins: () => ({ variable: "--font-poppins" }),
}))

// jsdom tidak menjalankan optimizer gambar Next.js; mock hanya memverifikasi
// src/alt yang kita kirim. Integrasi nyata diperiksa `pnpm build` dan Playwright.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const { metadata } = await import("@/app/layout")

afterEach(cleanup)

describe("judul halaman", () => {
  it("memakai ruvana sebagai satu-satunya judul", () => {
    expect(metadata.title).toBe("ruvana")
  })
})

describe("landing page publik", () => {
  it("memakai wordmark RUVANA dengan brand mark di header dan nama berbeda di footer", () => {
    render(<Home />)

    const headerBrand = screen.getByRole("link", { name: "Ruvana — beranda" })
    expect(headerBrand).toHaveTextContent("RUVANA")
    expect(headerBrand.querySelector("span[aria-hidden='true']")).not.toBeNull()

    const footerBrand = screen.getByRole("link", { name: "Ruvana — beranda, footer" })
    expect(footerBrand).toHaveTextContent("RUVANA")
  })

  it("menempatkan pengalih tema, Masuk, dan Daftar di aksi header", () => {
    const { container } = render(<Home />)

    const header = container.querySelector("header")
    expect(header).not.toBeNull()
    expect(header?.querySelector("button[aria-label^='Gunakan tema']")).not.toBeNull()
    expect(header?.querySelector("a[href='/masuk']")).toHaveTextContent("Masuk")
    expect(header?.querySelector("a[href='/daftar']")).toHaveTextContent("Daftar")
  })

  it("menandai Beranda sebagai lokasi aktif dan menautkan navigasi utama", () => {
    render(<Home />)

    const nav = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(nav.querySelector("a[href='/']")).toHaveAttribute("aria-current", "page")
    expect(nav.querySelector("a[href='/fasilitas']")).toHaveTextContent("Fasilitas")
    expect(nav.querySelector("a[href='#jadwal']")).toHaveTextContent("Jadwal")
  })

  it("mengarahkan setiap CTA Jelajahi Fasilitas ke rute fasilitas", () => {
    render(<Home />)

    const ctas = screen.getAllByRole("link", { name: /Jelajahi Fasilitas/ })
    expect(ctas).toHaveLength(2)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/fasilitas")
    }
  })

  it("mengirim form pencarian dengan seluruh tipe fasilitas berlabel Indonesia", () => {
    const { container } = render(<Home />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/fasilitas")

    expect(screen.getByLabelText("Pilih tipe fasilitas")).toHaveAttribute("name", "tipe")
    expect(screen.getByLabelText("Pilih tanggal")).toHaveAttribute("name", "tanggal")
    expect(screen.getByRole("button", { name: /Jelajahi/ })).toHaveAttribute("type", "submit")

    for (const label of Object.values(TIPE_FASILITAS_LABEL)) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument()
    }
  })

  it("menjalankan entrance hero sebagai stagger CSS dan bagian lain lewat reveal motion", () => {
    const { container } = render(<Home />)

    const heroTitle = container.querySelector("#hero-title")
    expect(heroTitle?.className).toContain("motion-rise")
    expect(heroTitle?.className).toContain("motion-rise-stagger")

    const staggerOrder = Array.from(
      container.querySelectorAll<HTMLElement>(".motion-rise-stagger"),
    ).map((node) => Number(node.style.getPropertyValue("--stagger-index")))

    expect(staggerOrder.length).toBeGreaterThanOrEqual(4)
    expect(staggerOrder).toEqual([...staggerOrder].sort((left, right) => left - right))
    expect(new Set(staggerOrder).size).toBe(staggerOrder.length)

    expect(container.querySelectorAll("[data-motion-reveal]").length).toBeGreaterThan(0)
  })

  it("membatasi node motion berkelanjutan dan tidak menyisakan loop idle", () => {
    const { container } = render(<Home />)

    const ambientNodes = container.querySelectorAll("[data-motion-ambient]")
    expect(ambientNodes.length).toBeGreaterThan(0)
    expect(ambientNodes.length).toBeLessThanOrEqual(4)

    expect(container.querySelectorAll(".ambient").length).toBe(0)
  })

  it("menyatakan visual hero bukan ketersediaan aktual", () => {
    render(<Home />)

    expect(
      screen.getByText("Ilustrasi tampilan Ruvana, bukan ketersediaan aktual."),
    ).toBeVisible()
  })
})
