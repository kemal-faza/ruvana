import { describe, expect, it } from "vitest"

import { LABEL_STATUS_RESERVASI } from "@/config/labels"
import type { StatusReservasi } from "@/generated/prisma/enums"
import {
  pesanSuksesPengajuan,
  ringkasGalatPengajuan,
  tampilanReservasi,
} from "@/lib/reservations/reservation-display"

const ENUM_MENTAH: StatusReservasi[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_OFFICER",
  "EXPIRED",
]

const dasar = {
  status: "PENDING" as StatusReservasi,
  date: "2026-12-02",
  startTime: "09:00",
  endTime: "10:00",
  submittedAt: "2026-11-30T02:00:00.000Z",
  processedAt: null,
}

describe("tampilanReservasi", () => {
  it.each(ENUM_MENTAH)("memetakan %s ke LABEL_STATUS_RESERVASI", (status) => {
    expect(tampilanReservasi({ ...dasar, status }).labelStatus).toBe(LABEL_STATUS_RESERVASI[status])
  })

  it("tidak menampilkan string enum mentah pada nilai tampil", () => {
    for (const status of ENUM_MENTAH) {
      const tampil = tampilanReservasi({ ...dasar, status })
      const gabungan = [tampil.labelStatus, tampil.tanggal, tampil.waktu, tampil.diajukanPada].join(" ")
      for (const enumMentah of ENUM_MENTAH) {
        expect(gabungan).not.toContain(enumMentah)
      }
    }
  })

  it("memformat tanggal dan waktu dalam bahasa Indonesia zona Asia/Jakarta", () => {
    const tampil = tampilanReservasi({ ...dasar, status: "APPROVED" })

    expect(tampil.tanggal).toBe("2 Des 2026")
    expect(tampil.waktu).toBe("09:00–10:00")
    expect(tampil.labelStatus).toBe("Disetujui")
  })

  it("menampilkan waktu proses hanya bila sudah diproses", () => {
    expect(tampilanReservasi({ ...dasar }).diprosesPada).toBe("-")
    expect(
      tampilanReservasi({ ...dasar, processedAt: "2026-11-30T03:00:00.000Z" }).diprosesPada,
    ).not.toBe("-")
  })
})

describe("pesanSuksesPengajuan", () => {
  it("memakai label domain tanpa enum mentah atau id teknis", () => {
    const pesan = pesanSuksesPengajuan()

    expect(pesan).toContain("Menunggu")
    for (const enumMentah of ENUM_MENTAH) {
      expect(pesan).not.toContain(enumMentah)
    }
    expect(pesan).not.toMatch(/#\d|\(id /)
  })
})

describe("ringkasGalatPengajuan", () => {
  it("memetakan field teknis ke istilah domain tanpa nama field mentah", () => {
    const pesan = ringkasGalatPengajuan(
      {
        detail: "Satu atau lebih field tidak memenuhi aturan validasi",
        errors: [
          { field: "tujuanPenggunaan", code: "TOO_SHORT", message: "tujuanPenggunaan tidak boleh kosong" },
          { field: "startTime", code: "INVALID_TIME", message: "startTime wajib diisi" },
        ],
      },
      422,
    )

    expect(pesan).toContain("Tujuan")
    expect(pesan).toContain("Jam mulai")
    expect(pesan).not.toContain("tujuanPenggunaan")
    expect(pesan).not.toContain("startTime")
    expect(pesan).not.toContain("TOO_SHORT")
  })

  it("menjelaskan konflik dengan bahasa Indonesia tanpa dump availability", () => {
    const pesan = ringkasGalatPengajuan(
      {
        detail: "Slot bertabrakan dengan reservasi yang telah disetujui.",
        availability: { slots: [] },
      },
      409,
    )

    expect(pesan).toContain("bertabrakan")
    expect(pesan).not.toContain("Availability")
    expect(pesan).not.toContain("slots")
  })

  it("menyembunyikan detail internal yang tidak aman", () => {
    const pesan = ringkasGalatPengajuan({ detail: "Gagal APPROVED karena CANCELLED_BY_USER" }, 500)

    expect(pesan).not.toContain("APPROVED")
    expect(pesan).not.toContain("CANCELLED_BY_USER")
  })
})
