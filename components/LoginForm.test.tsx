import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderToString } from "react-dom/server"
import { afterEach, expect, it, vi } from "vitest"
import LoginForm from "./LoginForm"

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => navigation }))
vi.mock("@/components/AuthPhotoPanel", () => ({ AuthPhotoPanel: () => null }))
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it("memakai POST native ke halaman sendiri, bukan endpoint JSON", () => {
  render(<LoginForm />)
  const form = screen.getByRole("button", { name: "Masuk" }).closest("form")

  expect(form).toHaveAttribute("method", "post")
  expect(form).not.toHaveAttribute("action")
  expect(screen.getByText("Kata sandi minimal 8 karakter.")).toBeInTheDocument()
})

it("menonaktifkan submit pada HTML sebelum hidrasi", () => {
  const container = document.createElement("div")
  container.innerHTML = renderToString(<LoginForm />)
  const form = container.querySelector("form")

  expect(form?.getAttribute("method")).toBe("post")
  expect(form?.getAttribute("action")).toBeNull()
  expect(form?.querySelector("button[type='submit']")).toHaveAttribute("disabled")
})

it("membuka riwayat reservasi setelah pengguna berhasil login", async () => {
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ user: { role: "pengguna" } }), { status: 200 }),
  ))
  render(<LoginForm />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Email/), "ayu@kampus.ac.id")
  await user.type(screen.getByLabelText(/Kata sandi/), "rahasia123")
  await user.click(screen.getByRole("button", { name: "Masuk" }))

  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/reservasi/riwayat"))
  expect(navigation.refresh).toHaveBeenCalledOnce()
})

it("menolak password multibyte di atas 72 byte sebelum request login", async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  render(<LoginForm />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Email/), "ayu@kampus.ac.id")
  await user.type(screen.getByLabelText(/Kata sandi/), "é".repeat(37))
  await user.click(screen.getByRole("button", { name: "Masuk" }))

  await waitFor(() => expect(screen.getByText("Kata sandi maksimal 72 karakter.")).toBeInTheDocument())
  expect(screen.getByLabelText(/Kata sandi/)).toHaveAttribute("aria-invalid", "true")
  expect(fetchMock).not.toHaveBeenCalled()
})

it("menolak kata sandi multibyte yang kurang dari 8 byte sebelum request login", async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  render(<LoginForm />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Email/), "ayu@kampus.ac.id")
  await user.type(screen.getByLabelText(/Kata sandi/), "ééé")
  await user.click(screen.getByRole("button", { name: "Masuk" }))

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Kata sandi minimal 8 karakter."))
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
