import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import NotFound, { metadata } from "@/app/not-found"

afterEach(cleanup)

describe("halaman tidak ditemukan", () => {
  it("memakai judul halaman ruvana saja", () => {
    expect(metadata.title).toBe("ruvana")
  })

  it("menawarkan jalan kembali ke beranda", () => {
    render(<NotFound />)

    expect(screen.getByRole("heading", { level: 1, name: "Alamat ini tidak tersedia." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Kembali ke beranda/ })).toHaveAttribute("href", "/")
  })
})
