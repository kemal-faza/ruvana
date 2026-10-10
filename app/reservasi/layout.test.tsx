import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import ReservasiLayout from "@/app/reservasi/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ requirePengguna: vi.fn(), pathname: "/reservasi" }))

vi.mock("@/lib/auth", () => ({ requirePengguna: mocks.requirePengguna }))
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  mocks.pathname = "/reservasi"
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

function konten() {
  return (
    <main id="konten" tabIndex={-1}>
      <p>Konten reservasi</p>
    </main>
  )
}

describe("ReservasiLayout", () => {
  it("menempatkan tautan lewati sebelum navigasi dan menargetkan main", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requirePengguna.mockResolvedValue({ ...account, role: Role.pengguna })

    const { container } = render(await ReservasiLayout({ children: konten() }))
    const skipLink = screen.getByRole("link", { name: "Lewati ke konten utama" })

    expect(container.querySelector("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")).toBe(
      skipLink,
    )
    expect(skipLink).toHaveAttribute("href", "#konten")
    expect(screen.getByRole("main")).toHaveAttribute("id", "konten")
    expect((await axe(container)).violations).toEqual([])
  })

  it("menampilkan akun sesi pengguna dan menandai menu Reservasi aktif", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requirePengguna.mockResolvedValue({ ...account, role: Role.pengguna })

    render(await ReservasiLayout({ children: konten() }))

    expect(mocks.requirePengguna).toHaveBeenCalledOnce()
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument()
    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getAllByRole("link", { name: "Reservasi" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it.each([
    { name: "pengunjung anonim", destination: "/login" },
    { name: "pengguna tidak berperan", destination: "/403" },
  ])("mengalihkan $name sebelum merender shell", async ({ destination }) => {
    mocks.requirePengguna.mockRejectedValue(new Error(`redirect:${destination}`))

    await expect(ReservasiLayout({ children: konten() })).rejects.toThrow(`redirect:${destination}`)
    expect(mocks.requirePengguna).toHaveBeenCalledOnce()
  })
})
