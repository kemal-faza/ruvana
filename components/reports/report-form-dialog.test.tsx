import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReportFormDialog } from "@/components/reports/report-form-dialog"
import type { FacilityReportOption } from "@/lib/services/report-service"

vi.mock("@/app/reports/actions", () => ({
  createReportAction: vi.fn(),
}))

const facilityOptions: FacilityReportOption[] = [
  {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    status: "ACTIVE",
  },
]

function renderDialog(open = true) {
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  render(
    <ReportFormDialog
      open={open}
      onOpenChange={onOpenChange}
      facilityOptions={facilityOptions}
      onCreated={onCreated}
    />,
  )
  return { onOpenChange, onCreated }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ReportFormDialog mengelola fokus (PRD 11.3 & 12)", () => {
  it("membuat modal yang sifatnya dialog dan mengarahkan fokus awal ke deskripsi", async () => {
    renderDialog()

    const dialog = screen.getByRole("dialog", { name: /Ajukan laporan/ })
    expect(dialog).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/Deskripsi kerusakan/)).toHaveFocus())
  })

  it("menutup dengan tombol Escape", async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.keyDown(screen.getByLabelText(/Deskripsi kerusakan/), { key: "Escape" })

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })

  it("menutup lewat tombol Batal dan tombol X di header", () => {
    const { onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Batal" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    onOpenChange.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "Tutup formulir" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("mengarahkan fokus ke bidang error pertama saat submit ditolak", async () => {
    renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Kirim laporan" }))

    await waitFor(() => expect(screen.getByLabelText(/Kategori/)).toHaveFocus())
  })
})