import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationContentSkeleton } from "@/app/reservasi/reservation-content-skeleton"
import ReservationPage from "@/app/reservasi/page"

vi.mock("@/app/reservasi/reservation-content", () => ({
  ReservationContent: () => {
    throw new Promise(() => {})
  },
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/reservasi",
}))

afterEach(cleanup)

describe("ReservationPage", () => {
  it("menampilkan shell dan fallback skeleton selama konten async dimuat", () => {
    render(<ReservationPage searchParams={Promise.resolve({})} />)

    expect(
      screen.getByRole("heading", { name: "Ajukan reservasi" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})

describe("ReservationContentSkeleton", () => {
  it("mengumumkan loading form", () => {
    render(<ReservationContentSkeleton />)

    expect(screen.getByRole("status")).toHaveTextContent("Memuat form reservasi")
  })
})
