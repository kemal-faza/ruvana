import { beforeEach, describe, expect, it, vi } from "vitest"

const { getPublicFacility, getFacilityAvailability } = vi.hoisted(() => ({
  getPublicFacility: vi.fn(),
  getFacilityAvailability: vi.fn(),
}))

vi.mock("@/lib/services/facility-service", () => ({ getPublicFacility }))
vi.mock("@/lib/services/availability-service", () => ({ getFacilityAvailability }))

import FasilitasDetailPage, { generateMetadata } from "./page"

describe("metadata title detail fasilitas", () => {
  beforeEach(() => {
    getFacilityAvailability.mockResolvedValue({
      facilityId: 8,
      date: "2026-09-15",
      timezone: "Asia/Jakarta",
      slots: [],
    })
    getPublicFacility.mockResolvedValue({
      id: 8,
      nama: "Laboratorium Kimia",
      tipe: "laboratorium",
      lokasi: "Gedung Sains",
      kapasitas: 24,
      deskripsi: "Laboratorium untuk praktikum kimia.",
      status: "ACTIVE",
    })
  })

  it("memakai nama fasilitas diikuti brand", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ facilityId: "8" }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.title).toBe("Laboratorium Kimia | ruvana")
    expect(metadata.alternates?.canonical).toBe("/fasilitas/8")
    expect(metadata.robots).toBeUndefined()
  })

  it("mengembalikan pengunjung ke katalog dari detail", async () => {
    const page = await FasilitasDetailPage({
      params: Promise.resolve({ facilityId: "8" }),
      searchParams: Promise.resolve({ date: "2026-09-15" }),
    })

    expect(page.props.basePath).toBe("/fasilitas")
  })

  it("memberi title sesuai halaman not-found fasilitas", async () => {
    const page = await import("./not-found")
    const metadata = "metadata" in page ? page.metadata : undefined

    expect(metadata?.title).toBe("Fasilitas tidak ditemukan | ruvana")
  })
})
