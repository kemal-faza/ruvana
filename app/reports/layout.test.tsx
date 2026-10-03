import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import ReportsLayout from "@/app/reports/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), pathname: "/reports" }))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  mocks.pathname = "/reports"
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

describe("ReportsLayout", () => {
  it.each([
    [Role.pengguna, "/reports", "/reservasi/riwayat"],
    [Role.petugas, "/petugas/antrian", "/petugas/pengaturan"],
    [Role.admin, "/admin/analitik", "/admin/pengaturan"],
  ] as const)("tidak menampilkan tautan role lain untuk %s", async (role, firstAllowed, secondAllowed) => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({ ...account, role })

    render(await ReportsLayout({ children: <p>Laporan</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    const hrefs = new Set(Array.from(within(navigation).getAllByRole("link")).map((link) => link.getAttribute("href")))
    expect(hrefs).toContain(firstAllowed)
    expect(hrefs).toContain(secondAllowed)
    if (role !== Role.pengguna) expect(hrefs).not.toContain("/reports")
    if (role === Role.pengguna) expect(hrefs).not.toContain("/petugas/antrian")
    if (role !== Role.admin) expect(hrefs).not.toContain("/admin/analitik")
  })
})
