import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createReportAction } from "@/app/reports/actions"
import { ReportFormDialog } from "@/components/reports/report-form-dialog"
import type { FacilityReportOption, ReportItem } from "@/lib/services/report-service"

vi.mock("@/app/reports/actions", () => ({
  createReportAction: vi.fn(),
}))

const facilityOptions: FacilityReportOption[] = [
  {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
  },
  {
    id: 2,
    nama: "RK-102",
    tipe: "ruang_kelas",
  },
]

const createdReport: ReportItem = {
  id: 17,
  facilityNama: "RK-102",
  facilityTipe: "ruang_kelas",
  facilityLokasi: "Gedung A Lt.2",
  facilityStatus: "ACTIVE",
  kategori: "Listrik",
  deskripsi: "Lampu ruang kelas tidak menyala.",
  fotoUrl: null,
  status: "NEW",
  catatanResolusi: null,
  ditanganiOleh: null,
  createdAt: "2026-09-27T00:00:00.000Z",
}

function renderDialog(open = true, options = facilityOptions) {
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  render(
    <ReportFormDialog
      open={open}
      onOpenChange={onOpenChange}
      facilityOptions={options}
      onCreated={onCreated}
    />,
  )
  return { onOpenChange, onCreated }
}

function mockPhotoUpload() {
  class TestURL extends URL {
    static createObjectURL() {
      return "blob:foto-test"
    }

    static revokeObjectURL() {}
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url === "/api/reports/photo-uploads" && init?.method === "POST") {
      return new Response(JSON.stringify({ pathname: "reports/test.png", uploadUrl: "https://blob.test/upload" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (url === "https://blob.test/upload") return new Response(null, { status: 200 })
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("URL", TestURL)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.keyboard("{Escape}")

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })

  it("menutup lewat tombol Batal dan tombol X di header", async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.click(screen.getByRole("button", { name: "Batal" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    onOpenChange.mockClear()

    await user.click(screen.getByRole("button", { name: "Tutup formulir" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("mengarahkan fokus ke bidang error pertama saat submit ditolak", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Kirim laporan" }))

    const kategori = screen.getByRole("combobox", { name: /Kategori/ })
    await waitFor(() => expect(kategori).toHaveFocus())
    expect(kategori).toHaveAttribute("aria-invalid", "true")
    expect(kategori).toHaveAttribute("aria-describedby", screen.getByText("Pilih kategori laporan.").id)
  })
})

describe("ReportFormDialog memilih fasilitas dan kategori", () => {
  it("membuka popup fasilitas dan memilih nilai dengan pointer", async () => {
    const user = userEvent.setup()
    renderDialog()
    const fasilitas = screen.getByRole("combobox", { name: /Fasilitas/ })

    expect(fasilitas).toHaveTextContent(/RK-101/)
    expect(document.querySelector('input[name="facilityId"]')).toHaveValue("1")

    await user.click(fasilitas)

    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="select-content"]')).toHaveAttribute("data-align-trigger", "false")
    await user.click(screen.getByRole("option", { name: /RK-102/ }))

    expect(fasilitas).toHaveTextContent(/RK-102/)
    expect(document.querySelector('input[name="facilityId"]')).toHaveValue("2")
  })

  it("menampilkan placeholder kategori dan memilih opsi lewat keyboard", async () => {
    const user = userEvent.setup()
    renderDialog()
    const kategori = screen.getByRole("combobox", { name: /Kategori/ })

    expect(kategori).toHaveTextContent("Pilih kategori...")
    await user.click(kategori)
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="select-content"]')).toHaveAttribute("data-align-trigger", "false")

    await user.keyboard("{Home}{Enter}")

    expect(kategori).toHaveTextContent("Listrik")
    expect(document.querySelector('input[name="kategori"]')).toHaveValue("Listrik")
  })

  it("menandai label wajib dan menonaktifkan fasilitas saat daftar kosong", () => {
    renderDialog(true, [])

    const fasilitas = screen.getByRole("combobox", { name: /Fasilitas/ })
    const kategori = screen.getByRole("combobox", { name: /Kategori/ })

    expect(fasilitas).toBeDisabled()
    expect(fasilitas).toHaveAttribute("aria-required", "true")
    expect(kategori).toHaveAttribute("aria-required", "true")
    expect(screen.getByText("Belum ada fasilitas yang tersedia untuk dilaporkan.")).toBeInTheDocument()
  })

  it("mengirim identifier fasilitas dan kategori yang dipilih setelah unggahan valid", async () => {
    const user = userEvent.setup()
    const fetchMock = mockPhotoUpload()
    vi.mocked(createReportAction).mockResolvedValue({ ok: true, item: createdReport })
    const { onCreated } = renderDialog()

    await user.click(screen.getByRole("combobox", { name: /Fasilitas/ }))
    await user.click(await screen.findByRole("option", { name: /RK-102/ }))

    const kategori = screen.getByRole("combobox", { name: /Kategori/ })
    await user.click(kategori)
    // Pilih lewat pointer, bukan keyboard: setelah popup terbuka, fokus kadang
    // masih di trigger sehingga {Home}{Enter} tidak memilih apa pun dan submit
    // ditolak validasi (flaky di CI). Jalur keyboard diuji di tes sebelumnya.
    await user.click(await screen.findByRole("option", { name: "Listrik" }))
    await user.type(screen.getByLabelText(/Deskripsi kerusakan/), "Lampu ruang kelas tidak menyala.")
    await user.upload(screen.getByLabelText(/Foto/), new File(["foto"], "lampu.png", { type: "image/png" }))
    await user.click(screen.getByRole("button", { name: "Kirim laporan" }))

    await waitFor(() => expect(createReportAction).toHaveBeenCalledTimes(1))
    const submitted = vi.mocked(createReportAction).mock.calls[0]?.[0]
    expect(submitted?.get("facilityId")).toBe("2")
    expect(submitted?.get("kategori")).toBe("Listrik")
    expect(submitted?.get("deskripsi")).toBe("Lampu ruang kelas tidak menyala.")
    expect(submitted?.get("fotoPathname")).toBe("reports/test.png")
    expect(fetchMock).toHaveBeenCalledWith("https://blob.test/upload", expect.objectContaining({ method: "PUT" }))
    expect(onCreated).toHaveBeenCalledWith(createdReport)
  })
})
