import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { ReservationQueue } from "@/components/staff/reservation-queue"
import type { StaffReservationResult } from "@/lib/services/reservation-service"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const item = {
  id: 92,
  facility: { id: 3, nama: "Aula Utama", tipe: "ruang_kelas", lokasi: "Gedung Serbaguna" },
  date: "2026-12-03",
  timezone: "Asia/Jakarta",
  startTime: "09:00",
  endTime: "10:00",
  startsAt: "2026-12-03T02:00:00.000Z",
  endsAt: "2026-12-03T03:00:00.000Z",
  tujuanPenggunaan: "Diskusi kelompok",
  status: "PENDING",
  alasan: null,
  submittedAt: "2026-12-01T02:00:00.000Z",
  processedAt: null,
  processedBy: null,
  pemohon: { id: 5, nama: "Siti Aminah", email: "siti@example.com" },
} as unknown as StaffReservationResult

function mockFetch() {
  const fetchMock = vi.fn(async (url: unknown) => {
    if (String(url).includes("/approve") || String(url).includes("/reject")) {
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
    } as Response
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("ReservationQueue", () => {
  it("menjelaskan urutan tanpa istilah teknis FIFO", async () => {
    mockFetch()
    const { container } = render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    expect((container.textContent ?? "")).not.toMatch(/FIFO/)
  })

  it("memberi tahu hasil persetujuan tanpa id teknis", async () => {
    const user = userEvent.setup()
    mockFetch()
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    await user.click(screen.getByRole("button", { name: "Setujui" }))

    const notice = await screen.findByRole("status").catch(() => screen.findByText(/telah disetujui/))
    expect(notice).toHaveTextContent("Aula Utama")
    expect(notice).toHaveTextContent(/telah disetujui/)
    expect(notice.textContent ?? "").not.toMatch(/#92/)
  })

  it("memakai frasa Kesalahan jaringan berbahasa Indonesia", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
      if (String(url).includes("/approve")) throw new Error("putus")
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
      } as Response
    }))
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    await user.click(screen.getByRole("button", { name: "Setujui" }))

    expect(await screen.findByText(/Kesalahan jaringan/)).toBeInTheDocument()
  })

  it("lolos pemeriksaan aksesibilitas", async () => {
    mockFetch()
    const { container } = render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    expect((await axe(container)).violations).toEqual([])
  })
})
