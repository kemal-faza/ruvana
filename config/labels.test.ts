import { describe, expect, it } from "vitest"

import { STATUS_RESERVASI } from "@/config/business"
import { LABEL_STATUS_RESERVASI } from "@/config/labels"
import { StatusReservasi } from "@/generated/prisma/enums"

// Label persis docs/DESIGN.md bagian Desain konten.
const LABEL_DESIGN: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED_BY_USER: "Dibatalkan Pengguna",
  CANCELLED_BY_OFFICER: "Dibatalkan Petugas",
  EXPIRED: "Kedaluwarsa",
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
