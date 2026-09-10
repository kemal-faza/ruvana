import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const setTheme = vi.fn()
let resolvedTheme = "light"

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}))

import { ThemeToggle } from "@/components/theme-toggle"

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear()
    resolvedTheme = "light"
  })

  it("menjelaskan dan menjalankan aksi tema berikutnya", async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(await screen.findByRole("button", { name: "Gunakan tema gelap" }))
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("menawarkan tema terang ketika tema aktif gelap", async () => {
    resolvedTheme = "dark"
    render(<ThemeToggle />)
    expect(await screen.findByRole("button", { name: "Gunakan tema terang" })).toBeInTheDocument()
  })
})
