import { beforeEach, describe, expect, it, vi } from "vitest"

const { getPublicFacility, getFacilityAvailability } = vi.hoisted(() => ({
  getPublicFacility: vi.fn(),
  getFacilityAvailability: vi.fn(),
}))
vi.mock("@/lib/services/facility-service", () => ({ getPublicFacility }))
vi.mock("@/lib/services/availability-service", () => ({ getFacilityAvailability }))

import { generateFacilityDetailMetadata, getFacilityDetail } from "./detail"

describe("detail fasilitas", () => {
  beforeEach(() => {
    getPublicFacility.mockReset()
    getFacilityAvailability.mockReset()
    getPublicFacility.mockResolvedValue({
      id: 8,
      nama: "Laboratorium Kimia",
      tipe: "laboratorium",
      lokasi: "Gedung Sains",
      kapasitas: 24,
      deskripsi: null,
      status: "ACTIVE",
    })
    getFacilityAvailability.mockResolvedValue(null)
  })

  it("tidak memanggil service untuk identifier tidak valid", async () => {
    expect(await getFacilityDetail("abc", "2026-09-15")).toBeNull()
    expect(getPublicFacility).not.toHaveBeenCalled()
  })

  it("tidak melakukan query untuk ID di luar jangkauan Int", async () => {
    expect(await getFacilityDetail("99999999999999999999")).toBeNull()
    expect(await generateFacilityDetailMetadata("99999999999999999999", "/fasilitas")).toEqual({})
    expect(getPublicFacility).not.toHaveBeenCalled()
    expect(getFacilityAvailability).not.toHaveBeenCalled()
  })

  it("memakai tanggal pilihan yang valid untuk ketersediaan", async () => {
    const detail = await getFacilityDetail("8", "2026-09-15")

    expect(getFacilityAvailability).toHaveBeenCalledWith(8, "2026-09-15")
    expect(detail).toMatchObject({ facility: { id: 8 }, date: "2026-09-15" })
  })

  it("membuat metadata dari data fasilitas di service", async () => {
    const metadata = await generateFacilityDetailMetadata("8", "/fasilitas")

    expect(metadata.title).toBe("Laboratorium Kimia | ruvana")
    expect(metadata.alternates?.canonical).toBe("/fasilitas/8")
  })
})
