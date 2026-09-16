import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { FacilitySearch } from "@/components/landing/facility-search"
import { TIPE_FASILITAS_LABEL } from "@/config/business"

afterEach(cleanup)

describe("FacilitySearch", () => {
  it("mengirim form pencarian ke rute fasilitas dengan method get", () => {
    const { container } = render(<FacilitySearch />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/fasilitas")
  })

  it("menyediakan opsi tipe fasilitas berlabel Indonesia", () => {
    render(<FacilitySearch />)

    const select = screen.getByLabelText("Pilih tipe fasilitas")
    expect(select).toHaveAttribute("name", "tipe")
    expect(screen.getByRole("option", { name: "Pilih fasilitas" })).toHaveValue("")

    for (const label of Object.values(TIPE_FASILITAS_LABEL)) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument()
    }
  })

  it("memberi label terprogram pada input tanggal", () => {
    render(<FacilitySearch />)

    const date = screen.getByLabelText("Pilih tanggal")
    expect(date).toHaveAttribute("name", "tanggal")
    expect(date).toHaveAttribute("type", "date")
  })

  it("menjadikan tombol Jelajahi sebagai submit form", () => {
    render(<FacilitySearch />)

    expect(screen.getByRole("button", { name: /Jelajahi/ })).toHaveAttribute("type", "submit")
  })

  it("menampilkan indikator fokus lewat pembungkus field", () => {
    const { container } = render(<FacilitySearch />)

    const fields = container.querySelectorAll("label")
    expect(fields).toHaveLength(2)

    for (const field of fields) {
      expect(field.className).toContain("focus-within:border-ring")
      expect(field.className).toContain("focus-within:ring-3")
      expect(field.className).toContain("focus-within:ring-ring/50")
    }
  })
})
