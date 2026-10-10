import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

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
  const fetchMock = vi.fn<(url: unknown, init?: { body?: unknown }) => Promise<Response>>(
    async () => new Response(JSON.stringify({ id: 99 }), { status: 201 }),
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    expect(screen.getByRole("button", { name: "Tampilkan ketersediaan" })).toHaveClass("bg-primary-subdued")
    expect(screen.getByRole("button", { name: "Ajukan reservasi" })).toHaveClass("bg-primary")
  })
})

describe("ReservationForm nama kontrol", () => {
  it("menyediakan nama aksesibel untuk pemilih Fasilitas dan Tanggal", () => {
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    expect(screen.getByRole("combobox", { name: "Fasilitas" })).toBeInTheDocument()
    expect(screen.getByLabelText("Tanggal")).toHaveTextContent("27 Sep 2026")
  })
})

describe("ReservationForm reset waktu", () => {
  it("mengembalikan jam dan tanggal ke keadaan halaman", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await isiWaktuDanTujuan(user)
    expect(screen.getByRole("combobox", { name: "Jam mulai" })).toHaveTextContent("09:00")

    // Tanggal diubah lewat kalender tetapi belum diterapkan ke server.
    await user.click(screen.getByLabelText("Tanggal"))
    const hariLain = document.querySelector<HTMLButtonElement>('td[data-day="2026-12-10"] button')
    expect(hariLain).not.toBeNull()
    await user.click(hariLain as HTMLButtonElement)
    expect(container.querySelector('input[name="date"]')).toHaveValue("2026-12-10")

    await user.click(screen.getByRole("button", { name: "Reset waktu" }))

    expect(screen.getByRole("combobox", { name: "Jam mulai" })).toHaveTextContent("Pilih jam mulai")
    expect(screen.getByLabelText("Tanggal")).toHaveTextContent("2 Des 2026")
    expect(container.querySelector('input[name="date"]')).toHaveValue("2026-12-02")
  }, 20000)
})

describe("ReservationForm facilityId", () => {
  it("mengirim facilityId default saat pilihan tidak diubah", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    // User memilih Lab tanpa memuat ulang halaman ("Tampilkan ketersediaan" tidak diklik)
    await user.click(comboboxFasilitas())
    await user.click(await screen.findByRole("option", { name: "Lab Komputer 1 | Gedung B Lt.2" }))
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
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
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await isiWaktuDanTujuan(user)
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    expect(await screen.findByText(/bertabrakan/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Segarkan slot" })).toBeInTheDocument()
    expect(screen.getByLabelText("Tujuan penggunaan")).toHaveValue("Diskusi kelompok")
    expect(document.body.textContent ?? "").not.toContain("Availability")
  }, 20000)
})

describe("ReservationForm batas pengajuan 14 hari", () => {
  // 10.00 UTC = 17.00 WIB 13 Sep. Untuk tanggal 27 Sep:
  // slot 07.00 WIB (00.00 UTC, selisih 13 hari 14 jam) wajib nonaktif,
  // slot 17.00 WIB (10.00 UTC, selisih tepat 336 jam / 14 hari) wajib aktif.
  const serverNow = "2026-09-13T10:00:00.000Z"

  function renderBatasPengajuan() {
    return render(
      <ReservationForm
        facilities={facilities}
        facilityId={3}
        date="2026-09-27"
        availability={null}
        serverNow={serverNow}
      />,
    )
  }

  it("menonaktifkan slot dalam jendela 14 hari tanpa sufiks status plus teks bantu", async () => {
    const user = userEvent.setup()
    renderBatasPengajuan()

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    const opsiMepet = await screen.findByRole("option", { name: "07:00" })
    expect(opsiMepet).toHaveAttribute("aria-disabled", "true")
    const opsiAktif = await screen.findByRole("option", { name: "17:00" })
    expect(opsiAktif).not.toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByText("Reservasi minimal 14 hari sebelum waktu mulai"),
    ).toBeInTheDocument()
  }, 20000)

  it("tidak menambahkan sufiks status apa pun pada label opsi", async () => {
    const user = userEvent.setup()
    renderBatasPengajuan()

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    await screen.findByRole("option", { name: "07:00" })
    expect(screen.queryByRole("option", { name: / — / })).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /sudah disetujui/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /pemeliharaan/ })).not.toBeInTheDocument()
  }, 20000)

  it("memetakan galat INSUFFICIENT_LEAD_TIME server ke pesan batas di field Jam mulai", async () => {
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
                {
                  field: "startTime",
                  code: "INSUFFICIENT_LEAD_TIME",
                  message: "Reservasi minimal 14 hari sebelum waktu mulai",
                },
              ],
            }),
            { status: 422 },
          ),
      ),
    )
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111")
    const { container } = renderBatasPengajuan()

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    await user.click(await screen.findByRole("option", { name: "17:00" }))
    await user.click(screen.getByRole("combobox", { name: "Jam selesai" }))
    await user.click(await screen.findByRole("option", { name: "17:30" }))
    await user.type(screen.getByLabelText("Tujuan penggunaan"), "Diskusi kelompok")
    await user.click(screen.getByRole("button", { name: "Ajukan reservasi" }))

    // Pesan domain tampil apa adanya di dekat field, bukan pesan generik atau kode mentah.
    expect(await screen.findByText("Reservasi minimal 14 hari sebelum waktu mulai.")).toBeInTheDocument()
    expect(document.activeElement?.id).toBe("jam-mulai")
    expect(container.textContent ?? "").not.toContain("INSUFFICIENT_LEAD_TIME")

    // Galat menggantikan teks bantu; aria-describedby tidak boleh menunjuk id yang hilang.
    expect(screen.getByRole("combobox", { name: "Jam mulai" })).not.toHaveAttribute("aria-describedby")

    const wilayahWaktu = container.querySelector('section[aria-label="Waktu"]')
    expect(wilayahWaktu).not.toBeNull()
    expect((await axe(wilayahWaktu as HTMLElement)).violations).toEqual([])
  }, 20000)

  it("lolos pemeriksaan aksesibilitas otomatis pada wilayah pemilih slot", async () => {
    const user = userEvent.setup()
    const { container } = renderBatasPengajuan()

    // Isi slot yang lolos H-14 (17.00 WIB = tepat 336 jam) agar seluruh
    // pemicu punya nama aksesibel sebelum diperiksa.
    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    await user.click(await screen.findByRole("option", { name: "17:00" }))
    await user.click(screen.getByRole("combobox", { name: "Jam selesai" }))
    await user.click(await screen.findByRole("option", { name: "17:30" }))
    await user.type(screen.getByLabelText("Tujuan penggunaan"), "Diskusi kelompok")

    // Cakupan dibatasi pada wilayah Waktu; pemicu Fasilitas dan Tanggal di luar
    // wilayah ini diperiksa pada test nama aksesibel di atas.
    const wilayahWaktu = container.querySelector('section[aria-label="Waktu"]')
    expect(wilayahWaktu).not.toBeNull()
    expect((await axe(wilayahWaktu as HTMLElement)).violations).toEqual([])
  }, 20000)
})

describe("ReservationForm label dan status opsi jam", () => {
  it("hanya menampilkan jam dan menonaktifkan slot yang sudah disetujui", async () => {
    const user = userEvent.setup()
    const availability = {
      facilityId: 3,
      date: "2026-09-27",
      timezone: "Asia/Jakarta" as const,
      slots: [{ startTime: "08:00", endTime: "08:30", available: false, blockedBy: "APPROVED" as const }],
    }
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={availability} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))

    const opsiTerisi = await screen.findByRole("option", { name: "08:00" })
    expect(opsiTerisi).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByRole("option", { name: /sudah disetujui/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: / — / })).not.toBeInTheDocument()
  }, 20000)

  it("tidak menonaktifkan opsi jam yang tersedia", async () => {
    const user = userEvent.setup()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    const opsiAktif = await screen.findByRole("option", { name: "09:00" })
    expect(opsiAktif).not.toHaveAttribute("aria-disabled", "true")
  }, 20000)
})

describe("ReservationForm navigasi prop tanpa remount", () => {
  const propsAwal = {
    facilities,
    facilityId: 3,
    date: "2026-12-02",
    availability: null as null,
    serverNow: "2026-09-01T00:00:00.000Z",
  }

  it("mempertahankan isian tujuan saat facility/date prop berubah (form tidak remount)", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ReservationForm {...propsAwal} />)

    const tujuan = screen.getByLabelText("Tujuan penggunaan")
    await user.type(tujuan, "Diskusi kelompok")

    rerender(<ReservationForm {...propsAwal} facilityId={4} date="2026-12-10" />)

    expect(screen.getByLabelText("Tujuan penggunaan")).toHaveValue("Diskusi kelompok")
    expect(tujuan).toBeInTheDocument()
    expect(tujuan.isConnected).toBe(true)
  }, 20000)

  it("sinkron pilihan fasilitas/tanggal dari prop baru dan mereset waktu", async () => {
    const user = userEvent.setup()
    const { container, rerender } = render(<ReservationForm {...propsAwal} />)

    await user.click(screen.getByRole("combobox", { name: "Jam mulai" }))
    await user.click(await screen.findByRole("option", { name: "09:00" }))
    expect(screen.getByRole("combobox", { name: "Jam mulai" })).toHaveTextContent("09:00")

    rerender(<ReservationForm {...propsAwal} facilityId={4} date="2026-12-10" />)

    expect(container.querySelector('input[name="facilityId"]')).toHaveValue("4")
    expect(container.querySelector('input[name="date"]')).toHaveValue("2026-12-10")
    expect(screen.getByRole("combobox", { name: "Jam mulai" })).toHaveTextContent("Pilih jam mulai")
  }, 20000)

  it("memindahkan fokus ke heading setelah ketersediaan baru tiba", async () => {
    const { rerender } = render(<ReservationForm {...propsAwal} />)
    const heading = screen.getByRole("heading", { name: "Fasilitas & tanggal" })

    rerender(<ReservationForm {...propsAwal} facilityId={4} date="2026-12-10" />)

    expect(document.activeElement).toBe(heading)
    expect(heading.isConnected).toBe(true)
  }, 20000)
})

describe("ReservationForm navigasi ketersediaan", () => {
  it("memakai router.push alih-alih navigasi penuh saat menampilkan ketersediaan", async () => {
    const user = userEvent.setup()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )
    const alamatSebelum = window.location.href

    await user.click(screen.getByRole("button", { name: "Tampilkan ketersediaan" }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reservasi?facilityId=3&date=2026-09-27"))
    expect(window.location.href).toBe(alamatSebelum)
  }, 20000)

  it("memuat slot otomatis saat fasilitas berubah lalu menampilkan teks bantu baru", async () => {
    const user = userEvent.setup()
    render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await user.click(comboboxFasilitas())
    await user.click(await screen.findByRole("option", { name: "Lab Komputer 1 | Gedung B Lt.2" }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reservasi?facilityId=4&date=2026-09-27"))
    expect(
      await screen.findByText("Slot belum diperbarui. Tekan Tampilkan ketersediaan."),
    ).toBeInTheDocument()
  }, 20000)

  it("memuat slot otomatis saat tanggal berubah", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-12-02" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    await user.click(screen.getByLabelText("Tanggal"))
    const hariLain = document.querySelector<HTMLButtonElement>('td[data-day="2026-12-10"] button')
    expect(hariLain).not.toBeNull()
    await user.click(hariLain as HTMLButtonElement)

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reservasi?facilityId=3&date=2026-12-10"))
    expect(container.querySelector('input[name="date"]')).toHaveValue("2026-12-10")
  }, 20000)

  it("meneruskan tipe aktif ke URL dan input tersembunyi", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ReservationForm facilities={facilities} facilityId={3} date="2026-09-27" type="aula" availability={null} serverNow="2026-09-01T00:00:00.000Z" />,
    )

    expect(container.querySelector('input[name="type"]')).toHaveValue("aula")

    await user.click(screen.getByRole("button", { name: "Tampilkan ketersediaan" }))

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/reservasi?facilityId=3&date=2026-09-27&type=aula"),
    )
  }, 20000)
})
