import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/facilities/catalog", () => ({
  getFacilityCatalog: vi.fn().mockResolvedValue({
    items: [],
    meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
    filterValue: {},
    paginationQuery: {},
    hasActiveFilters: false,
  }),
}))

vi.mock("@/components/facilities/facility-catalog", () => ({
  FacilityCatalog: () => <div data-testid="catalog">Daftar fasilitas</div>,
}))

import PublicFasilitasPage, { metadata } from "@/app/publik/fasilitas/page"

describe("halaman fasilitas publik", () => {
  it("memakai URL publik sebagai basis filter dan pagination", async () => {
    const page = await PublicFasilitasPage({ searchParams: Promise.resolve({}) })

    expect(page.props.basePath).toBe("/publik/fasilitas")
  })

  it("memakai URL publik sebagai canonical", () => {
    expect(metadata.alternates?.canonical).toBe("/publik/fasilitas")
  })
})
