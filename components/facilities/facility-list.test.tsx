import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { FacilityList } from "./facility-list"
import type { PublicFacility } from "@/lib/services/facility-service"

afterEach(cleanup)

const facility: PublicFacility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas",
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: "Ruang kelas standar",
  status: "ACTIVE",
}

describe("FacilityList", () => {
  it("menampilkan kartu fasilitas saat ada data", () => {
    render(<FacilityList items={[facility]} />)

    expect(screen.getByText("RK-101")).toBeInTheDocument()
  })

  it("menampilkan empty state 'Belum ada fasilitas' ketika tanpa filter", () => {
    render(<FacilityList items={[]} />)

    expect(screen.getByText("Belum ada fasilitas")).toBeInTheDocument()
    expect(screen.queryByText("Tidak ada fasilitas yang cocok")).not.toBeInTheDocument()
  })

  it("menampilkan empty state 'Tidak ada fasilitas yang cocok' + tautan reset saat filter aktif", () => {
    render(<FacilityList items={[]} hasActiveFilters />)

    expect(screen.getByText("Tidak ada fasilitas yang cocok")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute("href", "/fasilitas")
  })
})
