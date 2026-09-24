import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationForm } from "@/components/reservation/reservation-form"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

  it("mengirim facilityId yang baru dipilih user, bukan default Aula", async () => {
    const user = userEvent.setup()
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
