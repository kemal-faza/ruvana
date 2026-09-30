import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApprovedReservationList } from "@/components/staff/approved-reservation-list"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ApprovedReservationList loading", () => {
  it("menampilkan skeleton dan status sebelum daftar tiba", async () => {
    let resolveResponse: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveResponse = resolve })))

    render(<ApprovedReservationList />)

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat reservasi disetujui")
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Batalkan mendesak" })).not.toBeInTheDocument()

    resolveResponse?.({
      ok: true,
      json: async () => ({ items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } }),
    })

    expect(await screen.findByText("Tidak ada reservasi disetujui")).toBeInTheDocument()
  })
})
