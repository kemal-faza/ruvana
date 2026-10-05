import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import ReportsLayout from "@/app/reports/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ requirePengguna: vi.fn(), pathname: "/reports" }))

vi.mock("@/lib/auth", () => ({ requirePengguna: mocks.requirePengguna }))
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

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
  it("menampilkan navigasi pengguna tanpa tautan petugas dan admin", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requirePengguna.mockResolvedValue({ ...account, role: Role.pengguna })

    render(await ReportsLayout({ children: <p>Laporan</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    const hrefs = new Set(Array.from(within(navigation).getAllByRole("link")).map((link) => link.getAttribute("href")))
    expect(mocks.requirePengguna).toHaveBeenCalledOnce()
    expect(hrefs).toContain("/reports")
    expect(hrefs).toContain("/reservasi/riwayat")
    expect(hrefs).not.toContain("/petugas/antrian")
    expect(hrefs).not.toContain("/admin/analitik")
  })
})
