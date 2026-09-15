import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import Home from "@/app/page"

vi.mock("next/font/google", () => ({
  Poppins: () => ({ variable: "--font-poppins" }),
}))

const { metadata } = await import("@/app/layout")

afterEach(cleanup)

describe("judul halaman", () => {
  it("memakai ruvana sebagai satu-satunya judul", () => {
    expect(metadata.title).toBe("ruvana")
  })
})

describe("landing page publik", () => {
  it("memakai wordmark teks tanpa logo daun di header", () => {
    const { container } = render(<Home />)

    const brand = screen.getByRole("link", { name: "ruvana — Beranda" })
    expect(brand).toHaveTextContent(/^ruvana$/)
    expect(brand.querySelector("svg")).toBeNull()
    expect(container.querySelector("header svg.lucide-leaf")).toBeNull()
  })

  it("menempatkan CTA hero di header, bersebelahan dengan pengalih tema", () => {
    render(<Home />)

    const headerCta = screen
      .getAllByRole("link", { name: /Jelajahi Fasilitas/ })
      .find((link) => link.closest("header"))
    expect(headerCta).toHaveTextContent("Jelajahi Fasilitas")

    const headerActions = headerCta?.parentElement
    expect(headerActions?.querySelector("a[href='/fasilitas']")).toBe(headerCta)
    expect(headerActions?.querySelector("button[aria-label^='Gunakan tema']")).not.toBeNull()

    expect(screen.getAllByRole("link", { name: /Jelajahi Fasilitas/ })).toHaveLength(3)
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
})
