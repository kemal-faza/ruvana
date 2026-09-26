import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

afterEach(cleanup)

const options = ["Gedung A", "Gedung B"]

function Contoh({ defaultValue }: { defaultValue?: string }) {
  return (
    <form>
      <Combobox name="lokasi" items={options} defaultValue={defaultValue}>
        <ComboboxInput aria-label="Lokasi" placeholder="Semua lokasi">
          {defaultValue && <ComboboxClear aria-label="Hapus pilihan lokasi" />}
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxList>
            {(option: string) => (
              <ComboboxItem key={option} value={option}>
                {option}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>Lokasi tidak ditemukan.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </form>
  )
}

describe("Combobox", () => {
  it("menyediakan field bernama sesuai prop name untuk submission form", () => {
    const { container } = render(<Contoh />)

    expect(container.querySelector('input[name="lokasi"]')).toHaveValue("")
  })

  it("menampilkan placeholder selama belum ada pilihan", () => {
    render(<Contoh />)

    const input = screen.getByRole("combobox", { name: "Lokasi" })
    expect(input).toHaveValue("")
    expect(input).toHaveAttribute("placeholder", "Semua lokasi")
  })

  it("membuka daftar opsi saat input diaktifkan", async () => {
    const user = userEvent.setup()
    render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Lokasi" }))

    expect(await screen.findByRole("option", { name: "Gedung A" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Gedung B" })).toBeInTheDocument()
  })

  it("menyaring opsi berdasarkan ketikan", async () => {
    const user = userEvent.setup()
    render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Lokasi" }))
    await user.keyboard("Gedung B")

    expect(await screen.findByRole("option", { name: "Gedung B" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Gedung A" })).not.toBeInTheDocument()
  })

  it("mengumumkan pesan kosong saat tidak ada opsi yang cocok", async () => {
    const user = userEvent.setup()
    render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Lokasi" }))
    await user.keyboard("Gedung Z")

    expect(await screen.findByText("Lokasi tidak ditemukan.")).toBeInTheDocument()
  })

  it("menulis nilai terpilih ke field form dan menampilkan labelnya", async () => {
    const user = userEvent.setup()
    const { container } = render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Lokasi" }))
    await user.click(await screen.findByRole("option", { name: "Gedung B" }))

    expect(container.querySelector('input[name="lokasi"]')).toHaveValue("Gedung B")
    expect(screen.getByRole("combobox", { name: "Lokasi" })).toHaveValue("Gedung B")
  })

  it("mengosongkan pilihan lewat tombol hapus", async () => {
    const user = userEvent.setup()
    const { container } = render(<Contoh defaultValue="Gedung A" />)

    expect(container.querySelector('input[name="lokasi"]')).toHaveValue("Gedung A")

    await user.click(screen.getByRole("button", { name: "Hapus pilihan lokasi" }))

    expect(container.querySelector('input[name="lokasi"]')).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Lokasi" })).toHaveValue("")
  })
})
