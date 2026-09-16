import { describe, expect, it } from "vitest"

import { TIPE_FASILITAS, TIPE_FASILITAS_LABEL } from "@/config/business"

describe("label tipe fasilitas", () => {
  it("menyediakan satu label untuk setiap tipe fasilitas", () => {
    expect(Object.keys(TIPE_FASILITAS_LABEL).sort()).toEqual([...TIPE_FASILITAS].sort())
  })

  it("memakai label Indonesia bertanda baca sentence case", () => {
    expect(Object.values(TIPE_FASILITAS_LABEL)).toEqual([
      "Ruang kelas",
      "Aula",
      "Laboratorium",
      "Alat",
      "Lapangan",
    ])
    for (const label of Object.values(TIPE_FASILITAS_LABEL)) {
      expect(label).not.toMatch(/[_-]/)
    }
  })
})
