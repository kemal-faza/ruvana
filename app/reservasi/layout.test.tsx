import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import ReservasiLayout from "@/app/reservasi/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ requirePengguna: vi.fn(), pathname: "/reservasi/riwayat" }))

vi.mock("@/lib/auth", () => ({ requirePengguna: mocks.requirePengguna }))
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  mocks.pathname = "/reservasi/riwayat"
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

describe("ReservasiLayout", () => {
  it("mengalihkan pengunjung tanpa sesi ke halaman masuk", async () => {
    mocks.requirePengguna.mockRejectedValue(new Error("redirect:/login"))

    await expect(ReservasiLayout({ children: <p>Isi</p> })).rejects.toThrow("redirect:/login")
  })

  it("menempatkan tautan lewati sebelum navigasi dan menargetkan main", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requirePengguna.mockResolvedValue({ ...account, role: Role.pengguna })

    const { container } = render(await ReservasiLayout({ children: <p>Isi</p> }))
    const skipLink = screen.getByRole("link", { name: "Lewati ke konten utama" })

    expect(container.querySelector("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")).toBe(skipLink)
    expect(skipLink).toHaveAttribute("href", "#konten")
    expect(screen.getByRole("main")).toHaveAttribute("id", "konten")
    expect((await axe(container)).violations).toEqual([])
  })

  it("menampilkan navigasi pengguna untuk pengguna terautentikasi", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requirePengguna.mockResolvedValue({ ...account, role: Role.pengguna })

    render(await ReservasiLayout({ children: <p>Isi</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    const hrefs = new Set(Array.from(within(navigation).getAllByRole("link")).map((link) => link.getAttribute("href")))
    expect(mocks.requirePengguna).toHaveBeenCalledOnce()
    expect(hrefs).toContain("/reservasi/riwayat")
    expect(hrefs).toContain("/fasilitas")
    expect(screen.getByText("Isi")).toBeInTheDocument()
  })
})
