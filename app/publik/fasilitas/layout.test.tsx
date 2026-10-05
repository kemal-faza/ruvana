import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import PublicFacilityLayout from "@/app/publik/fasilitas/layout"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), pathname: "/publik/fasilitas" }))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
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

describe("PublicFacilityLayout", () => {
  it("menampilkan header publik dan daftar fasilitas tanpa shell akun untuk pengunjung anonim", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue(null)

    render(await PublicFacilityLayout({ children: <p>Daftar fasilitas</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getByRole("link", { name: "Fasilitas" })).toHaveAttribute("href", "/publik/fasilitas")
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.queryByRole("link", { name: "Reservasi" })).not.toBeInTheDocument()
    expect(screen.getByText("Daftar fasilitas")).toBeInTheDocument()
  })

  it("memakai navigasi peran untuk pengguna yang sudah masuk", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({ ...account, role: Role.pengguna })

    render(await PublicFacilityLayout({ children: <p>Daftar fasilitas</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getByRole("link", { name: "Reservasi Saya" })).toHaveAttribute(
      "href",
      "/reservasi/riwayat",
    )
    expect(within(navigation).getByRole("link", { name: "Fasilitas" })).toHaveAttribute("href", "/fasilitas")
    expect(screen.queryByRole("link", { name: "Masuk" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Daftar" })).not.toBeInTheDocument()
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument()
  })

  it("memakai navigasi petugas untuk petugas yang membuka katalog publik", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({ ...account, role: Role.petugas })

    render(await PublicFacilityLayout({ children: <p>Daftar fasilitas</p> }))

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" })
    expect(within(navigation).getByRole("link", { name: "Persetujuan reservasi" })).toHaveAttribute(
      "href",
      "/petugas/antrian",
    )
    expect(within(navigation).queryByRole("link", { name: "Reservasi" })).not.toBeInTheDocument()
  })
})
