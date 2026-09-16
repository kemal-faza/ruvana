import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { HeroVisual } from "@/components/landing/hero-visual"

// jsdom tidak menjalankan optimizer gambar Next.js; mock hanya memverifikasi
// src/alt yang kita kirim. Integrasi nyata diperiksa `pnpm build` dan Playwright.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

afterEach(cleanup)

describe("HeroVisual", () => {
  it("merender foto ruang dengan alt deskriptif", () => {
    render(<HeroVisual />)

    const photo = screen.getByRole("img", { name: "Peralatan laboratorium di atas meja kerja" })
    expect(photo).toHaveAttribute("src", "/ruvana-lab2.jpg")
  })

  it("memberi label pada foto tanpa mengandalkan warna", () => {
    render(<HeroVisual />)

    expect(screen.getByText("Laboratorium")).toBeVisible()
    expect(screen.getByText("Fasilitas aktif ↗")).toBeVisible()
  })

  it("menampilkan ringkasan reservasi dan laporan dengan status berteks", () => {
    render(<HeroVisual />)

    expect(screen.getByText("Ruvana untukmu")).toBeVisible()
    expect(screen.getByText("Reservasi")).toBeVisible()
    expect(screen.getByText("Laporan")).toBeVisible()
    expect(screen.getByText("Menunggu")).toBeVisible()
    expect(screen.getByText("Siap")).toBeVisible()
  })

  it("menyatakan bahwa visual bukan ketersediaan aktual", () => {
    render(<HeroVisual />)

    expect(
      screen.getByText("Ilustrasi tampilan Ruvana, bukan ketersediaan aktual."),
    ).toBeVisible()
  })

  it("menyembunyikan inisial avatar dari pembaca layar", () => {
    const { container } = render(<HeroVisual />)

    expect(container.querySelector("span[aria-hidden='true']")).not.toBeNull()
  })
})
