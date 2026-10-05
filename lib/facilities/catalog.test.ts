import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPublicFacilities } = vi.hoisted(() => ({ listPublicFacilities: vi.fn() }))
vi.mock("@/lib/services/facility-service", () => ({ listPublicFacilities }))

import { getFacilityCatalog } from "./catalog"

describe("getFacilityCatalog", () => {
  beforeEach(() => {
    listPublicFacilities.mockReset()
    listPublicFacilities.mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
    })
  })

  it("membersihkan filter kosong dan memakai nilai baku untuk kueri tidak valid", async () => {
    const result = await getFacilityCatalog({ search: "   ", page: "abc", type: "ruang" })

    expect(listPublicFacilities).toHaveBeenCalledWith({ page: 1, perPage: 20 })
    expect(result).toMatchObject({ hasActiveFilters: false, filterValue: {} })
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
