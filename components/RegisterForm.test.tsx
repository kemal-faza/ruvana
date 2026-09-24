import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import RegisterForm from "./RegisterForm"

vi.mock("@/components/AuthPhotoPanel", () => ({ AuthPhotoPanel: () => null }))
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function isiForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Nama lengkap/), "Siti Aminah")
  await user.type(screen.getByLabelText(/Email/), "SITI@KAMPUS.AC.ID")
  await user.type(screen.getByLabelText(/Kata sandi/), "rahasia123")
  await user.click(screen.getByRole("button", { name: "Daftar" }))
}

describe("RegisterForm", () => {
  it("mengirim JSON ke handler registrasi dan menampilkan keberhasilan", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)
    render(<RegisterForm />)
    await isiForm()
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pendaftaran berhasil"))
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ nama: "Siti Aminah", email: "SITI@KAMPUS.AC.ID", password: "rahasia123" }),
    }))
  })

  it("menampilkan konflik email pada field yang sesuai", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: "EMAIL_ALREADY_USED" }) }))
    render(<RegisterForm />)
    await isiForm()
    await waitFor(() => expect(document.getElementById("daftar-email-error")).toHaveTextContent("Email sudah terdaftar"))
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("aria-invalid", "true")
  })

  it("menerima password multibyte yang tepat 8 byte UTF-8", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)
    render(<RegisterForm />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Nama lengkap/), "Ayu")
    await user.type(screen.getByLabelText(/Email/), "ayu@kampus.ac.id")
    await user.type(screen.getByLabelText(/Kata sandi/), "éééé")
    await user.click(screen.getByRole("button", { name: "Daftar" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
      body: JSON.stringify({ nama: "Ayu", email: "ayu@kampus.ac.id", password: "éééé" }),
    }))
  })
})
