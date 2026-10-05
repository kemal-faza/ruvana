import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"
import LoadingPetugasDashboard from "@/app/petugas/loading"
import LoadingAntrian from "@/app/petugas/antrian/loading"
import PetugasLayout from "@/app/petugas/layout"

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  pathname: "/petugas",
}))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
  mocks.pathname = "/petugas"
  vi.clearAllMocks()
})

const petugas = {
  id: 7,
  nama: "Siti Aminah",
  email: "siti@ruvana.test",
  role: Role.petugas,
  status: AccountStatus.ACTIVE,
  waktuDaftar: new Date("2026-09-01T00:00:00.000Z"),
  waktuVerifikasi: null,
}

describe("PetugasLayout", () => {
  it("menjaga sidebar dan navigasi tampil saat konten dashboard berupa skeleton", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue(petugas)

    render(await PetugasLayout({ children: <LoadingPetugasDashboard /> }))

    expect(screen.getByRole("main", { name: "Memuat dashboard Petugas" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Persetujuan reservasi" })).toHaveAttribute(
      "href",
      "/petugas/antrian",
    )
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument()
  })

  it("tetap membatasi navigasi admin pada antrean ketika halaman antrean loading", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.pathname = "/petugas/antrian"
    mocks.getSessionUser.mockResolvedValue({ ...petugas, role: Role.admin })

    render(await PetugasLayout({ children: <LoadingAntrian /> }))

    expect(screen.getByRole("status", { name: "Memuat antrean reservasi" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Persetujuan reservasi" })).toHaveAttribute(
      "href",
      "/petugas/antrian",
    )
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument()
  })
})
