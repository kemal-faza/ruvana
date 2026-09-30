import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationForm } from "@/components/reservation/reservation-form"

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  pushMock.mockClear()
  refreshMock.mockClear()
})

const facilities = [
  { id: 3, nama: "Aula Utama", lokasi: "Gedung Serbaguna" },
  { id: 4, nama: "Lab Komputer 1", lokasi: "Gedung B Lt.2" },
]

function mockFetchOk() {
  const fetchMock = vi.fn(
    async (_url: unknown, init?: { body?: unknown }) =>
      new Response(JSON.stringify({ id: 99 }), { status: 201 }),
  )
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111")
  return fetchMock
}

function comboboxFasilitas() {
  const boxes = screen.getAllByRole("combobox")
  const box = boxes.find((b) => b.textContent?.includes("Aula") || b.textContent?.includes("Lab"))
  if (!box) throw new Error("combobox fasilitas tidak ditemukan")
  return box
}

async function isiWaktuDanTujuan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
  await user.click(await screen.findByRole("option", { name: "09:00" }))
  await user.click(screen.getByRole("combobox", { name: "Jam selesai" }))
  await user.click(await screen.findByRole("option", { name: "10:00" }))
  await user.type(screen.getByLabelText("Tujuan penggunaan"), "Diskusi kelompok")
}

describe("ReservationForm hierarki tombol", () => {
  it("aksi utama tiap area memakai varian primary yang mencolok", () => {
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} />,
    )

    expect(screen.getByRole("button", { name: "Tampilkan ketersediaan" })).toHaveClass("bg-primary-subdued")
    expect(screen.getByRole("button", { name: "Ajukan reservasi" })).toHaveClass("bg-primary")
  })
})

describe("ReservationForm facilityId", () => {
  it("mengirim facilityId default saat pilihan tidak diubah", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.facilityId).toBe(3)
  }, 20000)

  it("mengirim facilityId yang baru dipilih user, bukan default Aula", async () => {    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} />,
    )

    // User memilih Lab tanpa memuat ulang halaman ("Tampilkan ketersediaan" tidak diklik)
    await user.click(comboboxFasilitas())
    await user.click(await screen.findByRole("option", { name: "Lab Komputer 1 — Gedung B Lt.2" }))
    expect(container.querySelector('input[name="facilityId"]')).toHaveValue("4")

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.facilityId).toBe(4)
  }, 20000)
})

describe("ReservationForm label domain", () => {
  it("sukses mengarahkan ke halaman detail baru tanpa data mentah di layar", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reservasi/riwayat/99?baru=1"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(container.textContent ?? "").not.toContain("PENDING")
    expect(container.querySelector("pre")).not.toBeInTheDocument()
  }, 20000)

  it("memetakan galat validasi ke istilah domain tanpa nama field mentah", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              title: "Validasi gagal",
              detail: "Satu atau lebih field tidak memenuhi aturan validasi",
              errors: [
                { field: "tujuanPenggunaan", code: "TOO_SHORT", message: "tujuanPenggunaan tidak boleh kosong" },
              ],
            }),
            { status: 422 },
          ),
      ),
    )
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111")
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    expect(await screen.findByText(/Periksa kembali isian berikut/)).toBeInTheDocument()
    expect(screen.getByText(/Periksa kembali isian berikut: Tujuan/)).toBeInTheDocument()
    expect(container.textContent ?? "").not.toContain("tujuanPenggunaan")
    expect(container.textContent ?? "").not.toContain("Availability")
  }, 20000)
})

describe("ReservationForm konfirmasi pengajuan", () => {
  function mockFetchMenunggu(status: number, body: unknown) {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const fetchMock = vi.fn(async () => {
      await gate
      return new Response(JSON.stringify(body), { status })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111")
    return { fetchMock, release }
  }

  it("menampilkan label proses dan mencegah submit ganda saat mengirim", async () => {
    const user = userEvent.setup()
    const { fetchMock, release } = mockFetchMenunggu(201, { id: 77 })
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    const tombolProses = await screen.findByRole("button", { name: "Mengajukan..." })
    expect(tombolProses).toBeDisabled()
    await user.click(tombolProses)
    release()

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reservasi/riwayat/77?baru=1"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledTimes(1)
  }, 20000)

  it("menampilkan galat di dekat field beserta ringkasan dan fokus ke field pertama", async () => {
    const user = userEvent.setup()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} />,
    )

    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    const ringkasan = await screen.findByText(/Periksa kembali isian berikut/)
    expect(ringkasan).toHaveTextContent("Periksa kembali isian berikut: Jam mulai, Jam selesai, Tujuan.")
    expect(screen.getByText("Jam mulai wajib dipilih.")).toBeInTheDocument()
    expect(document.activeElement?.id).toBe("jam-mulai")
  }, 20000)

  it("konflik menjelaskan penyebab, menawarkan segarkan slot, dan mempertahankan input", async () => {
    const user = userEvent.setup()
    mockFetchMenunggu(409, {
      title: "Reservasi bertabrakan",
      detail: "Slot bertabrakan dengan reservasi yang telah disetujui.",
      availability: { slots: [] },
    }).release()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    expect(await screen.findByText(/bertabrakan/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Segarkan slot" })).toBeInTheDocument()
    expect(screen.getByLabelText("Tujuan penggunaan")).toHaveValue("Diskusi kelompok")
    expect(document.body.textContent ?? "").not.toContain("Availability")
  }, 20000)
})
