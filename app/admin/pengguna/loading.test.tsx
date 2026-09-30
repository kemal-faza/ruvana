import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LoadingPengguna from "@/app/admin/pengguna/loading"

afterEach(cleanup)

describe("LoadingPengguna", () => {
  it("mengumumkan loading dan menampilkan kerangka tabel", () => {
    render(<LoadingPengguna />)

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Memuat daftar pengguna")

    const rows = document.querySelectorAll('[data-slot="skeleton"]')
    expect(rows.length).toBeGreaterThanOrEqual(8)
  })
})
