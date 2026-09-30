import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationQueue } from "@/components/staff/reservation-queue"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ReservationQueue loading", () => {
  it("menampilkan skeleton dan status sebelum antrean tiba", async () => {
    let resolveResponse: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveResponse = resolve })))

    render(<ReservationQueue />)

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat antrean")
    expect(screen.queryByText("Memuat antrean…")).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Setujui" })).not.toBeInTheDocument()

    resolveResponse?.({
      ok: true,
      json: async () => ({ items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } }),
    })

    expect(await screen.findByText("Antrean kosong")).toBeInTheDocument()
  })
})
