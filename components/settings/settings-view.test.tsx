import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsView } from "@/components/settings/settings-view"

vi.mock("@/app/pengaturan/actions", () => ({
  changePasswordAction: vi.fn(),
  revokeOtherSessionsAction: vi.fn(),
  updateProfileAction: vi.fn(),
}))
const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }))

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", resolvedTheme: "light", setTheme }),
}))

const pengguna = {
  id: 7,
  nama: "Siti Aminah",
  email: "siti@kampus.ac.id",
  role: "pengguna" as const,
}

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

describe("SettingsView", () => {
  it("mengubah nama profil setelah bagian Profil dibuka dan menjaga email hanya-baca", () => {
    render(<SettingsView account={pengguna} />)
    fireEvent.click(screen.getByRole("button", { name: "Profil" }))

    expect(screen.getByLabelText(/Nama/)).toHaveValue("Siti Aminah")
    expect(screen.getByLabelText("Email")).toHaveValue("siti@kampus.ac.id")
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly")
    expect(screen.getByText("Pengguna")).toBeInTheDocument()
  })

  it("memenuhi ukuran minimum 44 px pada navigasi, tema, profil, dan keamanan", () => {
    render(<SettingsView account={pengguna} />)

    const navigation = within(screen.getByRole("navigation", { name: "Bagian pengaturan" }))
    for (const button of navigation.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11")
    }
    const themeGroup = within(screen.getByRole("group", { name: "Tema" }))
    for (const button of themeGroup.getAllByRole("button")) {
      expect(button).toHaveClass("size-11")
    }

    fireEvent.click(screen.getByRole("button", { name: "Profil" }))
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).toHaveClass("min-h-11")
    }

    fireEvent.click(screen.getByRole("button", { name: "Keamanan & masuk" }))
    for (const input of screen.getAllByLabelText(/Kata sandi/)) {
      expect(input).toHaveClass("min-h-11")
    }
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("min-h-11")
    }

  })

  it("menyatukan bahasa dan pilihan tema di General dengan indikator pilihan aktif", () => {
    render(<SettingsView account={pengguna} />)

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByLabelText("Bahasa")).toHaveValue("Bahasa Indonesia")
    expect(screen.queryByRole("button", { name: "Notifikasi" })).not.toBeInTheDocument()

    const themeGroup = within(screen.getByRole("group", { name: "Tema" }))
    const systemTheme = themeGroup.getByRole("button", { name: "Ikuti tema sistem" })
    const lightTheme = themeGroup.getByRole("button", { name: "Tema terang" })
    const darkTheme = themeGroup.getByRole("button", { name: "Tema gelap" })

    expect(systemTheme).toHaveAttribute("aria-pressed", "true")
    expect(systemTheme).toHaveClass("bg-primary-subdued", "ring-2", "ring-inset", "ring-ring")
    expect(lightTheme).toHaveAttribute("aria-pressed", "false")
    expect(darkTheme).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(lightTheme)
    expect(setTheme).toHaveBeenCalledWith("light")
  })

  it("tidak menampilkan menu notifikasi untuk admin", () => {
    render(<SettingsView account={{ ...pengguna, role: "admin", nama: "Admin Kampus" }} />)

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Notifikasi" })).not.toBeInTheDocument()
  })

  it("menyediakan bagian keamanan dalam Bahasa Indonesia", () => {
    render(<SettingsView account={pengguna} />)

    fireEvent.click(screen.getByRole("button", { name: "Keamanan & masuk" }))
    expect(screen.getByLabelText(/Kata sandi saat ini/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keluar dari perangkat lain" })).toBeInTheDocument()
  })
})
