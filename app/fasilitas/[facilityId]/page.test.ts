import { beforeEach, describe, expect, it, vi } from "vitest"

const { getPublicFacility } = vi.hoisted(() => ({ getPublicFacility: vi.fn() }))

vi.mock("@/lib/services/facility-service", () => ({ getPublicFacility }))

import { generateMetadata } from "./page"
import { generateMetadata as generatePublicMetadata } from "@/app/publik/fasilitas/[facilityId]/page"

describe("metadata title detail fasilitas", () => {
  beforeEach(() => {
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
  })

  it("memakai canonical pada rute detail fasilitas publik", async () => {
    const metadata = await generatePublicMetadata({
      params: Promise.resolve({ facilityId: "8" }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.alternates?.canonical).toBe("/publik/fasilitas/8")
  })

  it("memberi title sesuai halaman not-found fasilitas", async () => {
    const page = await import("./not-found")
    const metadata = "metadata" in page ? page.metadata : undefined

    expect(metadata?.title).toBe("Fasilitas tidak ditemukan | ruvana")
  })
})
