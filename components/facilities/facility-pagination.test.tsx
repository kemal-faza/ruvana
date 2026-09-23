import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { FacilityPagination } from "./facility-pagination"

afterEach(cleanup)

describe("FacilityPagination", () => {
  it("menampilkan teks 'Halaman x dari y'", () => {
    render(<FacilityPagination page={2} totalPages={5} query={{}} />)

    expect(screen.getByText("Halaman 2 dari 5")).toBeInTheDocument()
  })

  it("tidak dirender ketika hanya ada satu halaman", () => {
    const { container } = render(<FacilityPagination page={1} totalPages={1} query={{}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("menonaktifkan tombol Sebelumnya di halaman pertama", () => {
    render(<FacilityPagination page={1} totalPages={3} query={{}} />)

    const prev = screen.getByRole("button", { name: /sebelumnya/i })
    expect(prev).toHaveAttribute("aria-disabled", "true")
    expect(prev).not.toHaveAttribute("href")
  })

  it("menonaktifkan tombol Berikutnya di halaman terakhir", () => {
    render(<FacilityPagination page={3} totalPages={3} query={{}} />)

    const next = screen.getByRole("button", { name: /berikutnya/i })
    expect(next).toHaveAttribute("aria-disabled", "true")
    expect(next).not.toHaveAttribute("href")
  })

  it("mempertahankan filter aktif pada tautan halaman berikutnya", () => {
    render(
      <FacilityPagination page={1} totalPages={3} query={{ search: "lab", type: "laboratorium" }} />,
    )

    const next = screen.getByRole("button", { name: /berikutnya/i })
    const href = next.getAttribute("href") ?? ""
    expect(href).toContain("search=lab")
    expect(href).toContain("type=laboratorium")
    expect(href).toContain("page=2")
  })

  it("mempertahankan filter aktif pada tautan halaman sebelumnya", () => {
    render(<FacilityPagination page={2} totalPages={3} query={{ search: "lab" }} />)

    const prev = screen.getByRole("button", { name: /sebelumnya/i })
    expect(prev.getAttribute("href") ?? "").toContain("search=lab")
  })
})
