import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"
import LoginForm from "./LoginForm"

vi.mock("@/components/AuthPhotoPanel", () => ({ AuthPhotoPanel: () => null }))
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("menolak password multibyte di atas 72 byte sebelum request login", async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  render(<LoginForm />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Email/), "ayu@kampus.ac.id")
  await user.type(screen.getByLabelText(/Kata sandi/), "é".repeat(37))
  await user.click(screen.getByRole("button", { name: "Masuk" }))

  await waitFor(() => expect(screen.getByText(/maksimal 72 byte UTF-8/)).toBeInTheDocument())
  expect(screen.getByLabelText(/Kata sandi/)).toHaveAttribute("aria-invalid", "true")
  expect(fetchMock).not.toHaveBeenCalled()
})

it("menampilkan error email di bawah field tanpa mengirim request", async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  render(<LoginForm />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Email/), "ayu@invalid")
  await user.type(screen.getByLabelText(/Kata sandi/), "rahasia123")
  await user.click(screen.getByRole("button", { name: "Masuk" }))

  expect(await screen.findByText("Format email tidak valid.")).toBeInTheDocument()
  expect(screen.getByLabelText(/Email/)).toHaveAttribute("aria-invalid", "true")
  expect(fetchMock).not.toHaveBeenCalled()
})
