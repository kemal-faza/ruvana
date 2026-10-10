import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ReportDetailSheet } from "@/components/reports/report-detail-sheet"
import type { ReportItem } from "@/lib/services/report-service"

const report: ReportItem = {
  id: 1,
  facilityNama: "Ruang Kuliah",
  facilityTipe: "ruang_kelas",
  facilityLokasi: "Gedung Akademik Barat, Lantai 4, dekat ruang administrasi",
  facilityStatus: "ACTIVE",
  kategori: "Listrik",
  deskripsi: "Lampu di sisi barat tidak menyala.",
  fotoUrl: null,
  status: "NEW",
  catatanResolusi: null,
  ditanganiOleh: null,
  createdAt: "2026-09-26T02:30:00.000Z",
}

function renderDetail(overrides: Partial<ReportItem> = {}) {
  render(
    <ReportDetailSheet
      report={{ ...report, ...overrides }}
      open
      onOpenChange={() => undefined}
    />,
  )

  return screen.getByRole("dialog", { name: "Detail laporan" })
}

afterEach(() => cleanup())

describe("ReportDetailSheet", () => {
  it("menampilkan metadata lokasi, waktu pengajuan, dan petugas yang belum ditetapkan", () => {
    const dialog = renderDetail()

    const terms = within(dialog).getAllByRole("term")
    expect(terms.map((term) => term.textContent)).toEqual([
      "Lokasi",
      "Diajukan",
      "Ditangani oleh",
    ])
    const metadata = dialog.querySelector("dl")
    expect(metadata?.parentElement).toHaveClass("rounded-card", "border", "bg-card", "px-2.5")
    expect(metadata).toHaveClass("flex", "flex-col", "divide-y")
    for (const term of terms) {
      // Dua kolom: label lebar tetap, value rata kiri pada posisi x yang sama.
      expect(term.parentElement).toHaveClass(
        "grid",
        "grid-cols-[7.5rem_minmax(0,1fr)]",
        "gap-x-5",
        "py-1.5",
      )
      expect(term.parentElement).not.toHaveClass("rounded-card", "border", "bg-card")
      expect(term.nextElementSibling?.tagName).toBe("DD")
      expect(term.nextElementSibling).toHaveClass("wrap-break-word", "text-sm")
      expect(term.nextElementSibling).not.toHaveClass("text-right")
    }
    expect(within(dialog).getByText(report.facilityLokasi)).toHaveClass("wrap-break-word")
    expect(within(dialog).getByText("Belum ditetapkan")).toHaveClass("wrap-break-word")
    expect(within(dialog).getByText(/^\d{1,2} Sep 2026, \d{2}:\d{2}$/)).toHaveClass("wrap-break-word")
  })

  it("menampilkan nama dan peran petugas yang menangani laporan", () => {
    const dialog = renderDetail({
      ditanganiOleh: { id: 3, nama: "Ayu Pratama", role: "petugas" },
    })

    expect(within(dialog).getByText("Ayu Pratama")).toHaveClass("wrap-break-word")
    expect(within(dialog).getByText("petugas")).toHaveClass("wrap-break-word")
    expect(within(dialog).queryByText("Belum ditetapkan")).not.toBeInTheDocument()
  })

  it.each([
    ["RESOLVED", "Catatan resolusi", "Lampu telah diganti."],
    ["REJECTED", "Catatan penolakan", "Laporan duplikat."],
  ] as const)("mempertahankan %s beserta catatan terminalnya", (status, heading, note) => {
    const dialog = renderDetail({ status, catatanResolusi: note })

    expect(within(dialog).getByRole("heading", { name: heading })).toBeInTheDocument()
    expect(within(dialog).getByText(note)).toBeInTheDocument()
  })

  it("memakai transisi yang sama dengan drawer sidebar", () => {
    const dialog = renderDetail()

    expect(dialog).toHaveClass(
      "duration-motion-standard",
      "ease-motion-standard",
      "motion-reduce:transition-none",
    )
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass(
      "duration-motion-standard",
      "motion-reduce:transition-none",
    )
  })
})
