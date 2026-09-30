import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationHistoryList } from "@/components/reservation/reservation-history-list"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ReservationHistoryList loading", () => {
  it("menampilkan skeleton dan status saat data belum tiba", async () => {
    let resolveResponse: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveResponse = resolve })))

    render(<ReservationHistoryList />)

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat riwayat reservasi")
    expect(screen.queryByText("Memuat riwayat reservasi…")).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    resolveResponse?.({
      ok: true,
      json: async () => ({ items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } }),
    })

    expect(await screen.findByText("Belum ada reservasi")).toBeInTheDocument()
  })

  it("menampilkan error yang dapat dipulihkan saat muat gagal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    )

    render(<ReservationHistoryList />)

    expect(await screen.findByText("Gagal memuat riwayat. Silakan coba lagi.")).toBeInTheDocument()
  })
})
