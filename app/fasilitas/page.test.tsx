import { beforeEach, describe, expect, it, vi } from "vitest"

const { getFacilityCatalog, redirect } = vi.hoisted(() => ({
  getFacilityCatalog: vi.fn(),
  redirect: vi.fn(() => { throw new Error("redirect") }),
}))

vi.mock("next/navigation", () => ({ redirect }))
vi.mock("@/lib/facilities/catalog", () => ({ getFacilityCatalog }))
vi.mock("@/components/facilities/facility-catalog", () => ({
  FacilityCatalog: () => null,
}))

import FasilitasPage, { metadata } from "./page"

describe("halaman fasilitas", () => {
  beforeEach(() => {
    getFacilityCatalog.mockReset()
    redirect.mockClear()
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
})
