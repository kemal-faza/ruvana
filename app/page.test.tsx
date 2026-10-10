import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Role } from "@/generated/prisma/enums"
import Home from "@/app/page"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn() }))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  vi.clearAllMocks()
})

const account = { id: 7, nama: "Siti Aminah", email: "siti@ruvana.test" }

describe("Home", () => {
  it.each([
    [Role.pengguna, "/reservasi/riwayat"],
    [Role.petugas, "/petugas"],
    [Role.admin, "/admin/analitik"],
  ] as const)("mengarahkan tombol Dashboard ke halaman awal peran %s", async (role, tujuan) => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({ ...account, role })

    render(await Home())

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", tujuan)
    expect(screen.queryByRole("link", { name: "Masuk" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Daftar" })).not.toBeInTheDocument()
  })

  it("tetap menyediakan aksi masuk dan daftar bagi pengunjung anonim", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue(null)

    render(await Home())

    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Daftar" })).toHaveAttribute("href", "/daftar")
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument()
  })
})
