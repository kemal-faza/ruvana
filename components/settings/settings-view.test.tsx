import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SettingsView } from "@/components/settings/settings-view"

vi.mock("@/app/pengaturan/actions", () => ({
  changePasswordAction: vi.fn(),
  revokeOtherSessionsAction: vi.fn(),
  updateProfileAction: vi.fn(),
}))
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Ganti tema</button>,
}))

const pengguna = {
  id: 7,
  nama: "Siti Aminah",
  email: "siti@kampus.ac.id",
  role: "pengguna" as const,
}

afterEach(cleanup)

describe("SettingsView", () => {
  it("mengubah nama profil dan menjaga email hanya-baca", () => {
    render(<SettingsView account={pengguna} />)

    expect(screen.getByLabelText(/Nama/)).toHaveValue("Siti Aminah")
    expect(screen.getByLabelText("Email")).toHaveValue("siti@kampus.ac.id")
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly")
    expect(screen.getByText("Pengguna")).toBeInTheDocument()
  })

  it("menampilkan tujuan pantauan notifikasi yang sesuai role pengguna", () => {
    render(<SettingsView account={pengguna} />)
    fireEvent.click(screen.getByRole("button", { name: "Notifikasi" }))

    expect(screen.getByRole("link", { name: "Reservasi Saya" })).toHaveAttribute("href", "/reservasi/riwayat")
    expect(screen.getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports")
    expect(screen.getByText(/Notifikasi otomatis melalui email/)).toBeInTheDocument()
  })

  it("menampilkan tujuan pantauan admin sesuai role admin", () => {
    render(<SettingsView account={{ ...pengguna, role: "admin", nama: "Admin Kampus" }} />)
    fireEvent.click(screen.getByRole("button", { name: "Notifikasi" }))

    expect(screen.getByRole("link", { name: "Kelola pengguna" })).toHaveAttribute("href", "/admin/pengguna")
    expect(screen.getByRole("link", { name: "Analitik" })).toHaveAttribute("href", "/admin/analitik")
  })

  it("menyediakan bagian keamanan, bahasa, dan tampilan dalam Bahasa Indonesia", () => {
    render(<SettingsView account={pengguna} />)

    fireEvent.click(screen.getByRole("button", { name: "Keamanan & masuk" }))
    expect(screen.getByLabelText(/Kata sandi saat ini/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keluar dari perangkat lain" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Bahasa" }))
    expect(screen.getByLabelText("Bahasa antarmuka")).toHaveValue("Bahasa Indonesia")

    fireEvent.click(screen.getByRole("button", { name: "Tampilan" }))
    expect(screen.getByRole("button", { name: "Ganti tema" })).toBeInTheDocument()
  })
})
