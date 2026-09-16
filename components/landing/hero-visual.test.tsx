import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { HeroVisual } from "@/components/landing/hero-visual"

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

afterEach(cleanup)

describe("HeroVisual", () => {
  it("menampilkan satu mockup dashboard dengan sidebar tanpa profil", () => {
    render(<HeroVisual />)

    expect(screen.getByRole("article", { name: "Mockup dashboard Ruvana" })).toBeVisible()
    expect(screen.getByText("ruvana")).toBeVisible()
    expect(screen.getByText("Ringkasan")).toBeVisible()
    expect(screen.getByText("Fasilitas")).toBeVisible()
    expect(screen.getByText("Reservasi Saya")).toBeVisible()
    expect(screen.getByText("Laporan Saya")).toBeVisible()
    expect(screen.queryByText("Rani Amelia")).not.toBeInTheDocument()
  })

  it("menampilkan kartu foto laboratorium", () => {
    const { container } = render(<HeroVisual />)

    const photo = screen.getByRole("img", { name: "Peralatan laboratorium di atas meja kerja" })
    expect(photo).toHaveAttribute("src", "/ruvana-lab2.jpg")
    expect(photo).toHaveClass("scale-[1.08]", "blur-[1.25px]")
    expect(screen.getByText("Laboratorium")).toBeVisible()
    expect(container.querySelector("figcaption")).toHaveClass("top-[7%]", "left-[4%]")
  })

  it("merender kedua kartu dengan rasio 16:9", () => {
    const { container } = render(<HeroVisual />)
    const cards = container.querySelectorAll("[data-mockup-card]")

    expect(cards).toHaveLength(2)
    cards.forEach((card) => expect(card).toHaveClass("aspect-video"))
  })

  it("mempertahankan className tambahan pada wadah", () => {
    const { container } = render(<HeroVisual className="hero-kustom" />)

    expect(container.firstElementChild).toHaveClass("hero-kustom")
  })
})
