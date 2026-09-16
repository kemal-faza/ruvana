import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

afterEach(cleanup)

const options = [
  { value: "aula", label: "Aula" },
  { value: "laboratorium", label: "Laboratorium" },
]

function Contoh() {
  return (
    <form>
      <Select name="tipe" items={options}>
        <SelectTrigger aria-label="Pilih tipe fasilitas">
          <SelectValue placeholder="Pilih fasilitas" />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </form>
  )
}

describe("Select", () => {
  it("menyediakan field bernama sesuai prop name untuk submission form", () => {
    const { container } = render(<Contoh />)

    expect(container.querySelector('input[name="tipe"]')).toHaveValue("")
  })

  it("menampilkan placeholder sebelum ada pilihan", () => {
    render(<Contoh />)

    expect(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" })).toHaveTextContent(
      "Pilih fasilitas",
    )
  })

  it("membuka daftar opsi saat trigger diaktifkan", async () => {
    const user = userEvent.setup()
    render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" }))

    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    for (const option of options) {
      expect(screen.getByRole("option", { name: option.label })).toBeInTheDocument()
    }
  })

  it("menulis nilai terpilih ke field dan menampilkannya di trigger", async () => {
    const user = userEvent.setup()
    const { container } = render(<Contoh />)

    await user.click(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" }))
    await user.click(await screen.findByRole("option", { name: "Laboratorium" }))

    expect(container.querySelector('input[name="tipe"]')).toHaveValue("laboratorium")
    expect(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" })).toHaveTextContent(
      "Laboratorium",
    )
  })

  it("memilih opsi lewat keyboard", async () => {
    const user = userEvent.setup()
    const { container } = render(<Contoh />)

    await user.tab()
    expect(screen.getByRole("combobox", { name: "Pilih tipe fasilitas" })).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    expect(await screen.findByRole("listbox")).toBeInTheDocument()

    await user.keyboard("{Enter}")

    expect(container.querySelector('input[name="tipe"]')).toHaveValue("aula")
  })
})
