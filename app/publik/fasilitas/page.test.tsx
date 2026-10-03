import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/facilities/facility-catalog", () => ({
  FacilityCatalog: () => <div data-testid="catalog">Daftar fasilitas</div>,
}))

import PublicFasilitasPage, { metadata } from "@/app/publik/fasilitas/page"

describe("halaman fasilitas publik", () => {
  it("memakai URL publik sebagai basis filter dan pagination", () => {
    const page = PublicFasilitasPage({ searchParams: Promise.resolve({}) })

    expect(page.props.basePath).toBe("/publik/fasilitas")
  })

  it("memakai URL publik sebagai canonical", () => {
    expect(metadata.alternates?.canonical).toBe("/publik/fasilitas")
  })
})
