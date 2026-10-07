import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { FacilityFilterForm } from "./facility-filter-form"

afterEach(cleanup)

describe("FacilityFilterForm", () => {
  it("memakai form GET ke /fasilitas", () => {
    const { container } = render(<FacilityFilterForm />)

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/fasilitas")
  })

  it("bisa mengirim filter ke rute fasilitas", () => {
    const { container } = render(<FacilityFilterForm actionPath="/fasilitas" />)

    expect(container.querySelector("form")).toHaveAttribute("action", "/fasilitas")
    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute("href", "/fasilitas")
  })

  it("menyediakan input search, location, minCapacity, dan select type", () => {
    render(<FacilityFilterForm />)

    expect(screen.getByLabelText(/kata kunci/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/lokasi/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kapasitas minimum/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tipe/i)).toBeInTheDocument()
  })

  it("menampilkan nilai filter yang aktif sebagai default", () => {
    const { container } = render(
      <FacilityFilterForm
        value={{ search: "lab", location: "Gedung A", minCapacity: 30, type: "laboratorium" }}
      />,
    )

    expect(screen.getByLabelText(/kata kunci/i)).toHaveValue("lab")
    expect(screen.getByLabelText(/lokasi/i)).toHaveValue("Gedung A")
    expect(screen.getByLabelText(/kapasitas minimum/i)).toHaveValue(30)
    expect(screen.getByLabelText(/tipe/i)).toHaveTextContent("Laboratorium")
    expect(container.querySelector("input[name='type']")).toHaveValue("laboratorium")
  })

  it("mengirim name yang sesuai kontrak untuk tiap kontrol", () => {
    const { container } = render(<FacilityFilterForm />)

    expect(container.querySelector("input[name='search']")).not.toBeNull()
    expect(container.querySelector("input[name='type']")).not.toBeNull()
    expect(container.querySelector("input[name='location']")).not.toBeNull()
    expect(container.querySelector("input[name='minCapacity']")).not.toBeNull()
  })

  it("menyediakan tombol Terapkan dan tautan Reset ke /fasilitas", () => {
    render(<FacilityFilterForm />)

    expect(screen.getByRole("button", { name: /terapkan/i })).toBeInTheDocument()
    const reset = screen.getByRole("button", { name: /reset/i })
    expect(reset).toHaveAttribute("href", "/fasilitas")
  })

  it("menampilkan label 'Kapasitas minimum' untuk tipe ruangan", () => {
    render(<FacilityFilterForm value={{ type: "ruang_kelas" }} />)

    expect(screen.getByLabelText("Kapasitas minimum (orang)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Jumlah minimum (unit)")).not.toBeInTheDocument()
  })

  it("mengubah label menjadi 'Jumlah minimum' saat tipe alat", () => {
    render(<FacilityFilterForm value={{ type: "alat" }} />)

    expect(screen.getByLabelText("Jumlah minimum (unit)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Kapasitas minimum (orang)")).not.toBeInTheDocument()
  })

  it("mengubah label secara dinamis saat tipe alat dipilih", async () => {
    const user = userEvent.setup()
    render(<FacilityFilterForm />)

    expect(screen.getByLabelText("Kapasitas minimum (orang)")).toBeInTheDocument()

    await user.click(screen.getByLabelText(/tipe/i))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(screen.getByLabelText("Jumlah minimum (unit)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Kapasitas minimum (orang)")).not.toBeInTheDocument()
  })

  it("tetap memakai name minCapacity saat label berubah", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm />)

    await user.click(screen.getByLabelText(/tipe/i))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(container.querySelector("input[name='minCapacity']")).not.toBeNull()
  })

  it("mengembalikan filter tipe ke semua tipe dengan nilai kosong", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm />)

    await user.click(screen.getByLabelText(/tipe/i))
    await user.click(await screen.findByRole("option", { name: "Alat" }))
    expect(container.querySelector("input[name='type']")).toHaveValue("alat")

    await user.click(screen.getByLabelText(/tipe/i))
    await user.click(await screen.findByRole("option", { name: "Semua tipe" }))

    expect(container.querySelector("input[name='type']")).toHaveValue("")
    expect(screen.getByLabelText(/tipe/i)).toHaveTextContent("Semua tipe")
    expect(screen.getByLabelText("Kapasitas minimum (orang)")).toBeInTheDocument()
  })
})
