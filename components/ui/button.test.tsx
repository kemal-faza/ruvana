import { cleanup, render, screen } from "@testing-library/react"
import { Save } from "lucide-react"
import { afterEach, describe, expect, it } from "vitest"

import { Button, buttonVariants } from "@/components/ui/button"

afterEach(() => {
  cleanup()
})

describe("kontrak Button", () => {
  it("mengunci tombol dan mempertahankan nama saat loading", () => {
    render(<Button loading>Simpan perubahan</Button>)

    expect(screen.getByRole("button", { name: "Simpan perubahan" })).toBeDisabled()
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
  })

  it.each([
    ["primary", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border-border"],
    ["ghost", "hover:bg-muted"],
    ["danger", "bg-destructive"],
  ] as const)("menerima varian Button %s", (variant, expectedClass) => {
    render(<Button variant={variant}>Aksi {variant}</Button>)

    const button = screen.getByRole("button", { name: `Aksi ${variant}` })
    expect(button).toBeEnabled()
    expect(button).toHaveClass(expectedClass)
    expect(buttonVariants({ variant })).toContain(expectedClass)
  })

  it("meneruskan disabled dan mendukung ikon dekoratif sebagai child", () => {
    render(
      <Button disabled>
        <Save aria-hidden="true" />
        Simpan
      </Button>,
    )

    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled()
  })
})
