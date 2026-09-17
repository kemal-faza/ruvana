import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { cleanup } from "@testing-library/react"

import { FacilityCard } from "./facility-card"
import type { PublicFacility } from "@/lib/services/facility-service"

afterEach(cleanup)

const facility: PublicFacility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas",
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: "Ruang kelas standar ber-AC",
  status: "ACTIVE",
}

describe("FacilityCard", () => {
  it("menampilkan label Indonesia dan data fasilitas", () => {
    render(<FacilityCard facility={facility} />)

    expect(screen.getByText("RK-101")).toBeInTheDocument()
    expect(screen.getByText("Ruang kelas")).toBeInTheDocument()
    expect(screen.getByText("Tersedia")).toBeInTheDocument()
    expect(screen.getByText("Gedung A Lt.1")).toBeInTheDocument()
    expect(screen.getByText("Kapasitas 40 orang")).toBeInTheDocument()
  })

  it("menautkan tombol detail ke /fasilitas/{id}", () => {
    render(<FacilityCard facility={facility} />)

    const link = screen.getByRole("button", { name: /lihat detail/i })
    expect(link).toHaveAttribute("href", "/fasilitas/1")
  })

  it("memuat foto secara eager saat diminta agar cepat menjadi LCP", () => {
    const { container } = render(<FacilityCard facility={facility} eager />)

    expect(container.querySelector("img")).toHaveAttribute("loading", "eager")
  })

  it("menunda foto card berikutnya dengan lazy loading", () => {
    const { container } = render(<FacilityCard facility={facility} />)

    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy")
  })

  it("tidak menampilkan data reservasi atau identitas pemesan", () => {
    render(<FacilityCard facility={facility} />)

    expect(screen.queryByText(/reservasi/i)).not.toBeInTheDocument()
  })

  it("menampilkan badge Dalam Perbaikan untuk status UNDER_MAINTENANCE", () => {
    render(<FacilityCard facility={{ ...facility, status: "UNDER_MAINTENANCE" }} />)

    expect(screen.getByText("Dalam Perbaikan")).toBeInTheDocument()
  })
})
