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

  it("menautkan slot tersedia ke halaman masuk dengan tujuan kembali ke form pengajuan", () => {
    render(<FacilityDetailContent {...base} slotLinkMode="login" />)

    expect(screen.getByRole("heading", { level: 2, name: "Ketersediaan slot" })).toBeInTheDocument()

    const link = screen.getByRole("link", { name: /Tersedia/ })
    const href = link.getAttribute("href") ?? ""
    // Slot pertama yang tersedia pada fixture adalah 08:00.
    expect(href.startsWith("/login?next=")).toBe(true)
    expect(decodeURIComponent(href.slice("/login?next=".length))).toBe(
      "/reservasi?facilityId=8&date=2026-09-27&startTime=08:00",
    )
  })

  it("menautkan tiap slot tersedia ke jam mulainya sendiri", () => {
    render(
      <FacilityDetailContent
        {...base}
        slotLinkMode="login"
        availability={{
          ...availability,
          slots: [
            { startTime: "08:00", endTime: "08:30", available: true, blockedBy: null },
            { startTime: "09:00", endTime: "09:30", available: true, blockedBy: null },
          ],
        }}
      />,
    )

    const hrefs = screen
      .getAllByRole("link", { name: /Tersedia/ })
      .map((link) => decodeURIComponent((link.getAttribute("href") ?? "").slice("/login?next=".length)))

    expect(hrefs).toEqual([
      "/reservasi?facilityId=8&date=2026-09-27&startTime=08:00",
      "/reservasi?facilityId=8&date=2026-09-27&startTime=09:00",
    ])
  })

  it("tidak menautkan slot untuk peran yang tidak memesan", () => {
    render(<FacilityDetailContent {...base} slotLinkMode="none" />)

    expect(screen.queryByRole("link", { name: /Tersedia/ })).not.toBeInTheDocument()
    expect(screen.getByText("08:00")).toBeInTheDocument()
  })
})
