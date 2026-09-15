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

  it("menganimasikan hero lewat CSS dan bagian lain lewat reveal motion", () => {
    const { container } = render(<Home />)

    const heroCopy = container.querySelector("#hero-title")?.parentElement
    expect(heroCopy?.className).toContain("motion-rise")
    expect(container.querySelector("#hero-title")?.closest(".motion-rise")).not.toBeNull()
    expect(container.querySelectorAll("[data-motion-reveal]").length).toBeGreaterThan(0)
  })
})
