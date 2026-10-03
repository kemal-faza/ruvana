import { describe, expect, it } from "vitest"

import { STATUS_RESERVASI } from "@/config/business"
import { LABEL_STATUS_FASILITAS, LABEL_STATUS_RESERVASI } from "@/config/labels"
import { StatusFasilitas, StatusReservasi } from "@/generated/prisma/enums"

// Label persis DESIGN.md bagian Desain konten.
const LABEL_DESIGN: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED_BY_USER: "Dibatalkan Pengguna",
  CANCELLED_BY_OFFICER: "Dibatalkan Petugas",
  EXPIRED: "Kedaluwarsa",
}

const LABEL_STATUS_FASILITAS_DESIGN: Record<string, string> = {
  ACTIVE: "Aktif",
  UNDER_MAINTENANCE: "Dalam Perbaikan",
  INACTIVE: "Nonaktif",
}

describe("sinkronisasi status reservasi", () => {
  it("STATUS_RESERVASI sama persis dengan enum schema", () => {
    expect([...STATUS_RESERVASI].sort()).toEqual(Object.keys(StatusReservasi).sort())
  })

  it("setiap enum punya label dan setiap label punya enum", () => {
    expect(Object.keys(LABEL_STATUS_RESERVASI).sort()).toEqual(Object.keys(StatusReservasi).sort())
  })

  it("label sama persis dengan DESIGN.md", () => {
    for (const status of STATUS_RESERVASI) {
      expect(LABEL_STATUS_RESERVASI[status]).toBe(LABEL_DESIGN[status])
    }
  })
})

describe("sinkronisasi status fasilitas", () => {
  it("label sama persis dengan DESIGN.md dan mencakup semua enum", () => {
    expect(Object.keys(LABEL_STATUS_FASILITAS).sort()).toEqual(Object.keys(StatusFasilitas).sort())
    expect(LABEL_STATUS_FASILITAS).toEqual(LABEL_STATUS_FASILITAS_DESIGN)
  })
})
