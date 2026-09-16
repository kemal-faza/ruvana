import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

  it("mengirim tipe terpilih lewat field bernama tipe", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilitySearch />)

    expect(container.querySelector('input[name="tipe"]')).toHaveValue("")

    await user.click(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" }))
    await user.click(await screen.findByRole("option", { name: TIPE_FASILITAS_LABEL.aula }))

    expect(container.querySelector('input[name="tipe"]')).toHaveValue("aula")
  })

  it("menampilkan placeholder di trigger tanpa menjadikannya opsi terpilih", async () => {
    const user = userEvent.setup()
    render(<FacilitySearch />)

    const trigger = screen.getByRole("combobox", { name: "Pilih tipe fasilitas" })
    expect(trigger).toHaveTextContent("Pilih fasilitas")

    await user.click(trigger)

    expect(screen.queryByRole("option", { name: "Pilih fasilitas" })).not.toBeInTheDocument()
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

    const fields = container.querySelectorAll('[data-slot="search-field"]')
    expect(fields).toHaveLength(2)

    for (const field of fields) {
      expect(field.className).toContain("focus-within:border-ring")
      expect(field.className).toContain("focus-within:ring-3")
      expect(field.className).toContain("focus-within:ring-ring/50")
    }
  })
})
