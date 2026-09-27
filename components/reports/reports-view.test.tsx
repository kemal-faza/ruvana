import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReportsView } from "@/components/reports/reports-view"
import type { FacilityReportOption, ReportItem, ReportListView } from "@/lib/services/report-service"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("next/image", () => ({ default: "img" }))

vi.mock("@/components/reports/report-detail-sheet", () => ({
  ReportDetailSheet: () => null,
}))

vi.mock("@/components/reports/report-form-dialog", () => ({
  ReportFormDialog: () => null,
}))

const statuses: ReportItem["status"][] = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "NEW",
  "NEW",
  "NEW",
  "NEW",
  "NEW",
  "IN_PROGRESS",
  "REJECTED",
]

const items: ReportItem[] = statuses.map((status, index) => {
  const number = index + 1
  const date = `2026-09-${String(number).padStart(2, "0")}T10:00:00.000Z`

  return {
    id: number,
    facilityId: number,
    facilityNama: `Fasilitas ${String(number).padStart(2, "0")}`,
    facilityTipe: "ruang_kelas",
    facilityLokasi: `Gedung ${number}`,
    facilityStatus: "ACTIVE",
    kategori: "Listrik",
    deskripsi: `Deskripsi laporan ${number}`,
    fotoUrl: null,
    status,
    catatanResolusi: null,
    ditanganiOleh: null,
    createdAt: date,
    updatedAt: date,
  }
})

const view: ReportListView = {
  userId: 1,
  items,
  total: items.length,
  totalByStatus: {
    NEW: 7,
    IN_PROGRESS: 3,
    RESOLVED: 2,
    REJECTED: 2,
  },
}

const facilityOptions: FacilityReportOption[] = [
  {
    id: 1,
    nama: "Fasilitas 01",
    tipe: "ruang_kelas",
    lokasi: "Gedung 1",
    kapasitas: 40,
    status: "ACTIVE",
  },
]

function renderReports() {
  return render(<ReportsView view={view} facilityOptions={facilityOptions} />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ReportsView controls", () => {
  it("mempertahankan nama, jumlah, dan status aktif filter serta kembali ke halaman pertama", async () => {
    const user = userEvent.setup()
    renderReports()

    expect(screen.getByRole("button", { name: "Ajukan Laporan" })).toBeEnabled()
    const filterGroup = screen.getByRole("group", { name: "Filter status laporan" })
    const allFilter = within(filterGroup).getByRole("button", { name: "Semua, 14 laporan" })
    const newFilter = within(filterGroup).getByRole("button", { name: "Baru, 7 laporan" })
    expect(allFilter).toHaveAttribute("aria-pressed", "true")
    expect(allFilter).toHaveAttribute("data-slot", "button")
    expect(newFilter).toHaveAttribute("aria-pressed", "false")
    expect(within(filterGroup).getByRole("button", { name: "Diproses, 3 laporan" })).toBeInTheDocument()
    expect(within(filterGroup).getByRole("button", { name: "Selesai, 2 laporan" })).toBeInTheDocument()
    expect(within(filterGroup).getByRole("button", { name: "Ditolak, 2 laporan" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Berikutnya" }))
    expect(screen.getByText("2 / 3")).toBeInTheDocument()

    await user.click(newFilter)

    expect(newFilter).toHaveAttribute("aria-pressed", "true")
    expect(allFilter).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Fasilitas 12/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Fasilitas 13/ })).not.toBeInTheDocument()
  })

  it("mencari laporan dan mereset kata kunci serta filter ketika tidak ada hasil", async () => {
    const user = userEvent.setup()
    renderReports()

    const search = screen.getByRole("textbox", { name: "Cari laporan" })
    const filterGroup = screen.getByRole("group", { name: "Filter status laporan" })
    await user.click(within(filterGroup).getByRole("button", { name: "Baru, 7 laporan" }))
    const sort = screen.getByRole("combobox", { name: "Urutkan laporan" })
    await user.click(sort)
    await user.click(await screen.findByRole("option", { name: "Terlama" }))
    expect(sort).toHaveTextContent("Terlama")

    await user.type(search, "Fasilitas 05")
    expect(screen.getByText("1 laporan ditemukan")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Fasilitas 05/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Fasilitas 08/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Navigasi halaman laporan" })).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "Tidak ada hasil")
    expect(screen.getByText("Tidak ada laporan yang cocok")).toBeInTheDocument()
    expect(within(filterGroup).getByRole("button", { name: "Baru, 7 laporan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    await user.click(screen.getByRole("button", { name: "Reset filter" }))

    expect(search).toHaveValue("")
    expect(within(filterGroup).getByRole("button", { name: "Semua, 14 laporan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(sort).toHaveTextContent("Terbaru")
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Fasilitas 14/ })).toBeInTheDocument()
  })

  it("menampilkan laporan halaman tujuan dan menjaga tombol pada batas navigasi", async () => {
    const user = userEvent.setup()
    renderReports()

    const navigation = screen.getByRole("navigation", { name: "Navigasi halaman laporan" })
    const previous = within(navigation).getByRole("button", { name: "Sebelumnya" })
    const next = within(navigation).getByRole("button", { name: "Berikutnya" })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Fasilitas 14/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Fasilitas 08/ })).not.toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
    expect(previous).toBeEnabled()
    expect(next).toBeEnabled()
    expect(screen.getByRole("button", { name: /Fasilitas 08/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Fasilitas 14/ })).not.toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
    expect(previous).toBeEnabled()
    expect(next).toBeDisabled()
    expect(screen.getByRole("button", { name: /Fasilitas 02/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Fasilitas 08/ })).not.toBeInTheDocument()

    await user.click(previous)
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
    expect(next).toBeEnabled()
    expect(screen.getByRole("button", { name: /Fasilitas 08/ })).toBeInTheDocument()
  })

  it("mengurutkan lewat popup Select Ruvana dengan pointer", async () => {
    const user = userEvent.setup()
    renderReports()

    await user.click(screen.getByRole("button", { name: "Berikutnya" }))
    expect(screen.getByText("2 / 3")).toBeInTheDocument()

    const sort = screen.getByRole("combobox", { name: "Urutkan laporan" })

    await user.click(sort)
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    await user.click(screen.getByRole("option", { name: "Terlama" }))

    expect(sort).toHaveTextContent("Terlama")
    expect(screen.getByRole("button", { name: /Fasilitas 01/ })).toBeInTheDocument()
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
  })

  it("mendukung pemilihan urutan lewat keyboard", async () => {
    const user = userEvent.setup()
    renderReports()

    await user.tab()
    await user.tab()
    await user.tab()
    const sort = screen.getByRole("combobox", { name: "Urutkan laporan" })
    expect(sort).toHaveFocus()

    await user.keyboard("{ArrowDown}")
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    await user.keyboard("{End}{Enter}")

    expect(sort).toHaveTextContent("Terlama")
    expect(screen.getByRole("button", { name: /Fasilitas 01/ })).toBeInTheDocument()
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
  })
})
