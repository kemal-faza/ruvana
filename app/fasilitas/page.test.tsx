import { beforeEach, describe, expect, it, vi } from "vitest"

import { Role } from "@/generated/prisma/enums"

const { getFacilityCatalog, redirect, getSessionUser } = vi.hoisted(() => ({
  getFacilityCatalog: vi.fn(),
  redirect: vi.fn(() => { throw new Error("redirect") }),
  getSessionUser: vi.fn(),
}))

vi.mock("next/navigation", () => ({ redirect }))
vi.mock("@/lib/facilities/catalog", () => ({ getFacilityCatalog }))
vi.mock("@/lib/auth", () => ({ getSessionUser }))
vi.mock("@/components/facilities/facility-catalog", () => ({
  FacilityCatalog: () => null,
}))

import FasilitasPage, { metadata } from "./page"

describe("halaman fasilitas", () => {
  beforeEach(() => {
    getFacilityCatalog.mockReset()
    redirect.mockClear()
    getSessionUser.mockReset()
    getSessionUser.mockResolvedValue(null)
    getFacilityCatalog.mockResolvedValue({
      items: [],
      meta: { page: 2, perPage: 20, totalItems: 60, totalPages: 3 },
      filterValue: { search: "lab" },
      paginationQuery: { search: "lab" },
      hasActiveFilters: true,
    })
  })

  it("menjadikan URL tunggal fasilitas sebagai canonical", () => {
    expect(metadata.robots).toBeUndefined()
    expect(metadata.alternates?.canonical).toBe("/fasilitas")
  })

  it("mempertahankan filter dan pagination pada rute fasilitas", async () => {
    const page = await FasilitasPage({ searchParams: Promise.resolve({ search: "lab", page: "2" }) })

    expect(getFacilityCatalog).toHaveBeenCalledWith({ search: "lab", page: "2" })
    expect(page.props.basePath).toBe("/fasilitas")
    expect(page.props.paginationQuery).toEqual({ search: "lab" })
    expect(page.props.meta.page).toBe(2)
  })

  it("mengarahkan pagination di luar rentang ke URL katalog aktif", async () => {
    getFacilityCatalog.mockResolvedValueOnce({ redirectQuery: "search=lab&page=2" })

    await expect(FasilitasPage({ searchParams: Promise.resolve({ search: "lab", page: "9" }) }))
      .rejects.toThrow("redirect")

    expect(redirect).toHaveBeenCalledExactlyOnceWith("/fasilitas?search=lab&page=2")
  })

  it.each([
    { peran: "pengunjung anonim", user: null, harapan: true },
    { peran: "pengguna", user: { id: 1, role: Role.pengguna }, harapan: true },
    { peran: "petugas", user: { id: 2, role: Role.petugas }, harapan: false },
    { peran: "admin", user: { id: 3, role: Role.admin }, harapan: false },
  ])("menandai alur reservasi kartu untuk $peran", async ({ user, harapan }) => {
    getSessionUser.mockResolvedValue(user)

    const page = await FasilitasPage({ searchParams: Promise.resolve({}) })

    expect(page.props.canStartReservation).toBe(harapan)
  })
})
