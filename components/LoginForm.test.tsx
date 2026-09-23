import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import LoginForm from "@/components/LoginForm"

vi.mock("@/app/login/actions", () => ({
  login: vi.fn(),
}))

afterEach(cleanup)

describe("LoginForm", () => {
  it("menampilkan formulir masuk tanpa logo", () => {
    const { container } = render(<LoginForm />)

    expect(screen.getByRole("heading", { level: 1, name: "Masuk ke akun" })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("name", "email")
    expect(screen.getByLabelText(/kata sandi/i)).toHaveAttribute("name", "password")
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Kembali ke beranda" })).toHaveAttribute("href", "/")
    expect(container.querySelector("img")).toBeNull()
    expect(screen.queryByText("RUVANA")).not.toBeInTheDocument()
  })

  it("tidak memiliki pelanggaran aksesibilitas dasar", async () => {
    const { container } = render(<LoginForm />)

    expect((await axe(container)).violations).toEqual([])
  })
})
