import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReservationHistoryList } from "@/components/reservation/reservation-history-list"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Body disalin persis dari respons nyata GET /api/reservations
// ?status=CANCELLED_BY_OFFICER (HTTP 200) terhadap database lokal.
const RESPONS_KOSONG_NYATA = {
  items: [],
  meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 },
}

const SATU_ITEM = {
  id: 31,
  facility: { id: 2, nama: "RK-102", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1" },
  date: "2026-09-30",
  timezone: "Asia/Jakarta",
  startTime: "10:00",
  endTime: "11:00",
  tujuanPenggunaan: "test 2",
  status: "APPROVED",
  alasan: null,
  submittedAt: "2026-09-29T19:03:27.642Z",
  processedAt: "2026-09-29T19:03:34.139Z",
  processedBy: null,
}

function mockFetchRiwayat() {
  const fetchMock = vi.fn(async (url: unknown) => {
    const qs = String(url).split("?")[1] ?? ""
    const body = qs.includes("status=CANCELLED_BY_OFFICER")
      ? RESPONS_KOSONG_NYATA
      : { items: [SATU_ITEM], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }
    return new Response(JSON.stringify(body), { status: 200 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("ReservationHistoryList filter kosong", () => {
  it("memilih Dibatalkan Petugas menampilkan empty state, bukan galat", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchRiwayat()
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    await user.click(screen.getByRole("combobox", { name: "Filter status" }))
    await user.click(await screen.findByRole("option", { name: "Dibatalkan Petugas" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("status=CANCELLED_BY_OFFICER"))
    })
    expect(await screen.findByText("Belum ada reservasi")).toBeInTheDocument()
    expect(screen.getByText("Tidak ada reservasi dengan status ini.")).toBeInTheDocument()
    expect(screen.queryByText("Gagal memuat riwayat. Silakan coba lagi.")).not.toBeInTheDocument()
  }, 20000)
})
