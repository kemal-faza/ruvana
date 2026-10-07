import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPublicFacilities, listPublicLocations } = vi.hoisted(() => ({
  listPublicFacilities: vi.fn(),
  listPublicLocations: vi.fn(),
}))
vi.mock("@/lib/services/facility-service", () => ({ listPublicFacilities, listPublicLocations }))

import { getFacilityCatalog } from "./catalog"

describe("getFacilityCatalog", () => {
  beforeEach(() => {
    listPublicFacilities.mockReset()
    listPublicFacilities.mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
    })
    listPublicLocations.mockReset()
    listPublicLocations.mockResolvedValue([])
  })

  it("membersihkan filter kosong dan memakai nilai baku untuk kueri tidak valid", async () => {
    const result = await getFacilityCatalog({ search: "   ", page: "abc", type: "ruang" })

    expect(listPublicFacilities).toHaveBeenCalledWith({ page: 1, perPage: 20 })
    expect(result).toMatchObject({ hasActiveFilters: false, filterValue: {} })
  })

  it("mengembalikan daftar lokasi fasilitas publik", async () => {
    listPublicLocations.mockResolvedValue(["Gedung A", "Gedung B"])

    const result = await getFacilityCatalog({})

    expect(result).toMatchObject({ locations: ["Gedung A", "Gedung B"] })
  })

  it("menyediakan parameter kanonis untuk halaman di luar rentang", async () => {
    listPublicFacilities.mockResolvedValue({
      items: [],
      meta: { page: 9, perPage: 20, totalItems: 24, totalPages: 2 },
    })

    const result = await getFacilityCatalog({ search: " lab ", page: "9" })

    expect(listPublicFacilities).toHaveBeenCalledWith({ page: 9, perPage: 20, search: "lab" })
    expect(result).toEqual({ redirectQuery: "search=lab&page=2" })
  })
})
