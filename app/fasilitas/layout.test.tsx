import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import FasilitasLayout from "@/app/fasilitas/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), pathname: "/fasilitas" }))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  mocks.pathname = "/fasilitas"
  vi.clearAllMocks()
})

const account = {
  id: 7,
  nama: "Siti Aminah",
  email: "siti@ruvana.test",
  status: AccountStatus.ACTIVE,
  waktuDaftar: new Date("2026-09-01T00:00:00.000Z"),
  waktuVerifikasi: null,
}

describe("FasilitasLayout", () => {
  it.each([
    [Role.pengguna, ["/reservasi/riwayat", "/reservasi", "/fasilitas", "/reports", "/pengaturan"], ["/petugas", "/admin"]],
    [Role.petugas, ["/petugas", "/petugas/antrian", "/petugas/pengaturan"], ["/reservasi", "/reports", "/admin"]],
    [Role.admin, ["/admin/analitik", "/admin/pengguna", "/admin/pengaturan"], ["/reservasi", "/reports", "/petugas"]],
  ] as const)("memakai navigasi sesuai peran terautentikasi %s", async (role, expected, forbidden) => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({ ...account, role })

    render(await FasilitasLayout({ children: <p>Daftar fasilitas</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    const hrefs = new Set(Array.from(within(navigation).getAllByRole("link")).map((link) => link.getAttribute("href")))
    for (const href of expected) expect(hrefs).toContain(href)
    for (const href of forbidden) expect(hrefs).not.toContain(href)
  })

  it("memakai header publik tanpa sidebar untuk pengunjung anonim", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue(null)

    render(await FasilitasLayout({ children: <p>Daftar fasilitas</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getByRole("link", { name: "Beranda" })).toHaveAttribute("href", "/")
    expect(within(navigation).getByRole("link", { name: "Fasilitas" })).toHaveAttribute("aria-current", "page")
    expect(within(navigation).getByRole("link", { name: "Jadwal" })).toHaveAttribute("href", "#jadwal")
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Daftar" })).toHaveAttribute("href", "/daftar")
    expect(screen.queryByRole("link", { name: "Reservasi" })).not.toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Navigasi footer" })).toBeInTheDocument()
  })
})
