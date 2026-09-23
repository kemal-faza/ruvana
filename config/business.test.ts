import { describe, expect, it } from "vitest"

import {
  KATEGORI_LAPORAN,
  LAPORAN_UPLOAD,
  MAKS_DESKRIPSI_LAPORAN,
  TIPE_FASILITAS,
  TIPE_FASILITAS_LABEL,
} from "@/config/business"

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

describe("konstanta laporan (Modul 4)", () => {
  it("kategori laporan mengikuti daftar PRD REP-01", () => {
    expect(KATEGORI_LAPORAN).toEqual([
      "Listrik",
      "Peralatan",
      "Furnitur",
      "Bangunan",
      "Kebersihan",
      "Lainnya",
    ])
  })

  it("hanya mengizinkan JPEG/PNG/WebP maksimal 5 MiB", () => {
    expect(LAPORAN_UPLOAD.tipeDiizinkan).toEqual(["image/jpeg", "image/png", "image/webp"])
    expect(LAPORAN_UPLOAD.maksByte).toBe(5 * 1024 * 1024)
  })

  it("deskripsi laporan dibatasi 2.000 karakter", () => {
    expect(MAKS_DESKRIPSI_LAPORAN).toBe(2000)
  })
})
