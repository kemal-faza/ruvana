import { cleanup, render, screen } from "@testing-library/react"
import { Save } from "lucide-react"
import Link from "next/link"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Button, buttonVariants } from "@/components/ui/button"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

  it("menjaga tautan navigasi tetap link tanpa memperingatkan Base UI", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <Button render={<Link href="/petugas/laporan">Laporan kerusakan</Link>}>Laporan kerusakan</Button>,
    )

    const link = screen.getByRole("link", { name: "Laporan kerusakan" })
    expect(link).toHaveAttribute("href", "/petugas/laporan")
    expect(link).toHaveClass("bg-primary")
    expect(error).not.toHaveBeenCalled()
  })

  it("menghormati nativeButton eksplisit pada render non-button", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <Button nativeButton={false} render={<Link href="/fasilitas">Fasilitas</Link>}>
        Fasilitas
      </Button>,
    )

    expect(screen.getByRole("button", { name: "Fasilitas" }).tagName).toBe("A")
    expect(error).not.toHaveBeenCalled()
  })

  it("mempertahankan Button yang dirender sebagai elemen anak", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <Button render={<Button>Pilihkan</Button>} />,
    )

    expect(screen.getByRole("button", { name: "Pilihkan" }).tagName).toBe("BUTTON")
    expect(error).not.toHaveBeenCalled()
  })
})
