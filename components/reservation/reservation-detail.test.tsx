import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationDetail } from "@/components/reservation/reservation-detail"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ReservationDetail loading", () => {
  it("menampilkan skeleton dan status sebelum detail tiba", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))

    render(<ReservationDetail id={7} />)

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat detail reservasi")
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})
