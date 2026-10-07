import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { FacilityFilterForm } from "./facility-filter-form"

afterEach(cleanup)

const locations = ["Gedung A", "Gedung B"]

describe("FacilityFilterForm", () => {
  it("memakai form GET ke /fasilitas", () => {
    const { container } = render(<FacilityFilterForm locations={locations} />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/fasilitas")
  })

  it("bisa mengirim filter ke rute fasilitas publik", () => {
    const { container } = render(
      <FacilityFilterForm locations={locations} actionPath="/publik/fasilitas" />,
    )

    expect(container.querySelector("form")).toHaveAttribute("action", "/publik/fasilitas")
    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute("href", "/publik/fasilitas")
  })

  it("menyediakan input search, location, minCapacity, dan combobox type", () => {
    render(<FacilityFilterForm locations={locations} />)

    expect(screen.getByLabelText(/kata kunci/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kapasitas minimum/i)).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Tipe" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Lokasi" })).toBeInTheDocument()
  })

  it("menampilkan nilai filter yang aktif sebagai default", () => {
    const { container } = render(
      <FacilityFilterForm
        locations={locations}
        value={{ search: "lab", location: "Gedung A", minCapacity: 30, type: "laboratorium" }}
      />,
    )

    expect(screen.getByLabelText(/kata kunci/i)).toHaveValue("lab")
    expect(screen.getByRole("combobox", { name: "Lokasi" })).toHaveValue("Gedung A")
    expect(screen.getByLabelText(/kapasitas minimum/i)).toHaveValue(30)
    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("Laboratorium")
    expect(container.querySelector("input[name='type']")).toHaveValue("laboratorium")
    expect(container.querySelector("input[name='location']")).toHaveValue("Gedung A")
  })

  it("mengirim name yang sesuai kontrak untuk tiap kontrol", () => {
    const { container } = render(<FacilityFilterForm locations={locations} />)

    expect(container.querySelector("input[name='search']")).not.toBeNull()
    expect(container.querySelector("input[name='type']")).not.toBeNull()
    expect(container.querySelector("input[name='location']")).not.toBeNull()
    expect(container.querySelector("input[name='minCapacity']")).not.toBeNull()
  })

  it("menulis pilihan lokasi dari dropdown ke field form", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm locations={locations} />)

    await user.click(screen.getByRole("combobox", { name: "Lokasi" }))
    await user.click(await screen.findByRole("option", { name: "Gedung B" }))

    expect(container.querySelector("input[name='location']")).toHaveValue("Gedung B")
  })

  it("menyediakan tombol Terapkan dan tautan Reset ke /fasilitas", () => {
    render(<FacilityFilterForm locations={locations} />)

    expect(screen.getByRole("button", { name: /terapkan/i })).toBeInTheDocument()
    const reset = screen.getByRole("button", { name: /reset/i })
    expect(reset).toHaveAttribute("href", "/fasilitas")
  })

  it("menampilkan label 'Kapasitas minimum' untuk tipe ruangan", () => {
    render(<FacilityFilterForm locations={locations} value={{ type: "ruang_kelas" }} />)

    expect(screen.getByLabelText("Kapasitas minimum (orang)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Jumlah minimum (unit)")).not.toBeInTheDocument()
  })

  it("mengubah label menjadi 'Jumlah minimum' saat tipe alat", () => {
    render(<FacilityFilterForm locations={locations} value={{ type: "alat" }} />)

    expect(screen.getByLabelText("Jumlah minimum (unit)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Kapasitas minimum (orang)")).not.toBeInTheDocument()
  })

  it("mengubah label secara dinamis saat tipe alat dipilih", async () => {
    const user = userEvent.setup()
    render(<FacilityFilterForm locations={locations} />)

    expect(screen.getByLabelText("Kapasitas minimum (orang)")).toBeInTheDocument()

    await user.click(screen.getByRole("combobox", { name: "Tipe" }))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(screen.getByLabelText("Jumlah minimum (unit)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Kapasitas minimum (orang)")).not.toBeInTheDocument()
  })

  it("tetap memakai name minCapacity saat label berubah", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm locations={locations} />)

    await user.click(screen.getByRole("combobox", { name: "Tipe" }))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(container.querySelector("input[name='minCapacity']")).not.toBeNull()
  })
})
