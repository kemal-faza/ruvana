import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LoadingAntrian from "@/app/petugas/antrian/loading"

afterEach(cleanup)

describe("LoadingAntrian", () => {
  it("mengumumkan loading dan menampilkan kerangka antrean", () => {
    render(<LoadingAntrian />)

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Memuat antrean reservasi")

    const cards = document.querySelectorAll('[data-slot="skeleton"]')
    expect(cards.length).toBeGreaterThanOrEqual(6)
  })
})
