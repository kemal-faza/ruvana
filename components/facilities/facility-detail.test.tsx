import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FacilityDetailContent } from "./facility-detail"
import type { FacilityAvailability } from "@/lib/availability/slots"
import type { PublicFacility } from "@/lib/services/facility-service"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/fasilitas",
}))

afterEach(cleanup)

const facility: PublicFacility = {
  id: 8,
  nama: "Ruang Sidang",
  tipe: "ruang_kelas",
  lokasi: "Gedung A Lt.2",
  kapasitas: 30,
  deskripsi: "Ruang sidang rapat.",
  status: "ACTIVE",
  fotoUrl: null,
}

const availability: FacilityAvailability = {
  facilityId: 8,
  date: "2026-09-27",
  timezone: "Asia/Jakarta",
  slots: [
    { startTime: "08:00", endTime: "08:30", available: true, blockedBy: null },
    { startTime: "08:30", endTime: "09:00", available: false, blockedBy: "APPROVED" },
  ],
}

const base = {
  facility,
  date: "2026-09-27",
  today: "2026-09-27",
  availability,
  basePath: "/fasilitas",
}

describe("FacilityDetailContent", () => {
  it("menempel form reservasi terkunci dengan pemilih jam kotak untuk pengguna", () => {
    render(<FacilityDetailContent {...base} slotLinkMode="form" serverNow="2026-09-01T00:00:00.000Z" />)

    expect(screen.getByRole("heading", { level: 2, name: "Ajukan reservasi" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tampilkan ketersediaan" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Fasilitas" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^08:00/ })).toBeInTheDocument()
  })

  it("menautkan slot tersedia ke halaman masuk untuk pengunjung anonim", () => {
    render(<FacilityDetailContent {...base} slotLinkMode="login" />)

    expect(screen.getByRole("heading", { level: 2, name: "Ketersediaan slot" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Tersedia/ })).toHaveAttribute("href", "/login")
  })

  it("tidak menautkan slot untuk peran yang tidak memesan", () => {
    render(<FacilityDetailContent {...base} slotLinkMode="none" />)

    expect(screen.queryByRole("link", { name: /Tersedia/ })).not.toBeInTheDocument()
    expect(screen.getByText("08:00")).toBeInTheDocument()
  })
})
