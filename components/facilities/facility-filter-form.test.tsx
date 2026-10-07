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

    expect(screen.getByRole("searchbox", { name: "Kata kunci" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Lokasi" })).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Tipe" })).toBeInTheDocument()
  })

  it("menampilkan nilai filter yang aktif sebagai default", () => {
    const { container } = render(
      <FacilityFilterForm
        value={{ search: "lab", location: "Gedung A", minCapacity: 30, type: "laboratorium" }}
      />,
    )

    expect(screen.getByRole("searchbox", { name: "Kata kunci" })).toHaveValue("lab")
    expect(screen.getByRole("textbox", { name: "Lokasi" })).toHaveValue("Gedung A")
    expect(screen.getByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).toHaveValue(30)
    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("Laboratorium")
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

    expect(screen.getByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton", { name: "Jumlah minimum (unit)" })).not.toBeInTheDocument()
  })

  it("mengubah label menjadi 'Jumlah minimum' saat tipe alat", () => {
    render(<FacilityFilterForm value={{ type: "alat" }} />)

    expect(screen.getByRole("spinbutton", { name: "Jumlah minimum (unit)" })).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).not.toBeInTheDocument()
  })

  it("mengubah label secara dinamis saat tipe alat dipilih", async () => {
    const user = userEvent.setup()
    render(<FacilityFilterForm />)

    expect(screen.getByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).toBeInTheDocument()

    await user.click(screen.getByRole("combobox", { name: "Tipe" }))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(screen.getByRole("spinbutton", { name: "Jumlah minimum (unit)" })).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).not.toBeInTheDocument()
  })

  it("tetap memakai name minCapacity saat label berubah", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm />)

    await user.click(screen.getByRole("combobox", { name: "Tipe" }))
    await user.click(await screen.findByRole("option", { name: "Alat" }))

    expect(container.querySelector("input[name='minCapacity']")).not.toBeNull()
  })

  it("mengembalikan filter tipe ke semua tipe lewat tombol hapus", async () => {
    const user = userEvent.setup()
    const { container } = render(<FacilityFilterForm />)

    await user.click(screen.getByRole("combobox", { name: "Tipe" }))
    await user.click(await screen.findByRole("option", { name: "Alat" }))
    expect(container.querySelector("input[name='type']")).toHaveValue("alat")

    await user.click(screen.getByRole("button", { name: "Hapus pilihan tipe" }))

    expect(container.querySelector("input[name='type']")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("")
    expect(screen.getByRole("spinbutton", { name: "Kapasitas minimum (orang)" })).toBeInTheDocument()
  })

  it("menampilkan tombol silang hanya pada field yang terisi", () => {
    render(
      <FacilityFilterForm
        value={{ search: "lab", type: "laboratorium", location: "Gedung A", minCapacity: 30 }}
      />,
    )

    expect(screen.getByRole("button", { name: "Hapus kata kunci" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hapus pilihan tipe" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hapus lokasi" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hapus nilai kapasitas" })).toBeInTheDocument()
  })

  it("tidak menampilkan tombol silang saat semua field kosong", () => {
    render(<FacilityFilterForm />)

    expect(screen.queryByRole("button", { name: "Hapus kata kunci" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Hapus pilihan tipe" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Hapus lokasi" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Hapus nilai kapasitas" })).not.toBeInTheDocument()
  })

  it("mengosongkan tiap field lewat tombol silang", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <FacilityFilterForm
        value={{ search: "lab", type: "laboratorium", location: "Gedung A", minCapacity: 30 }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Hapus kata kunci" }))
    await user.click(screen.getByRole("button", { name: "Hapus pilihan tipe" }))
    await user.click(screen.getByRole("button", { name: "Hapus lokasi" }))
    await user.click(screen.getByRole("button", { name: "Hapus nilai kapasitas" }))

    expect(container.querySelector("input[name='search']")).toHaveValue("")
    expect(container.querySelector("input[name='type']")).toHaveValue("")
    expect(container.querySelector("input[name='location']")).toHaveValue("")
    expect(container.querySelector("input[name='minCapacity']")).toHaveValue(null)
    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("")
  })

  it("mereset field saat nilai filter berubah (mis. tekan Reset)", () => {
    const { rerender } = render(
      <FacilityFilterForm value={{ search: "lab", type: "laboratorium" }} />,
    )
    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("Laboratorium")

    rerender(<FacilityFilterForm value={{}} />)

    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("")
    expect(screen.getByRole("searchbox", { name: "Kata kunci" })).toHaveValue("")
    expect(screen.queryByRole("button", { name: "Hapus pilihan tipe" })).not.toBeInTheDocument()
  })
})
