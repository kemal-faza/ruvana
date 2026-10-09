import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { ReservationDetail } from "@/components/reservation/reservation-detail"
import type { ReservationResult } from "@/lib/services/reservation-service"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const data = {
  id: 91,
  facility: {
    id: 3,
    nama: "Aula Utama",
    tipe: "ruang_kelas",
    lokasi: "Gedung Serbaguna",
    kapasitas: 100,
    deskripsi: null,
    status: "ACTIVE",
  },
  date: "2026-12-02",
  timezone: "Asia/Jakarta",
  startTime: "09:00",
  endTime: "10:00",
  startsAt: "2026-12-02T02:00:00.000Z",
  endsAt: "2026-12-02T03:00:00.000Z",
  tujuanPenggunaan: "Diskusi kelompok",
  status: "PENDING",
  alasan: null,
  submittedAt: "2026-11-30T02:00:00.000Z",
  processedAt: null,
  processedBy: null,
} as unknown as ReservationResult

function mockFetchOk(payload: ReservationResult = data) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
  )
}

describe("ReservationDetail", () => {
  it("menampilkan header domain Tujuan, Tanggal, dan Waktu yang terpisah", async () => {
    mockFetchOk()
    render(<ReservationDetail id={91} />)

    expect(await screen.findByText("Aula Utama")).toBeInTheDocument()
    expect(screen.getByText("Tanggal")).toBeInTheDocument()
    expect(screen.getByText("Waktu")).toBeInTheDocument()
    expect(screen.getByText("Tujuan")).toBeInTheDocument()
    expect(screen.queryByText("Tujuan penggunaan")).not.toBeInTheDocument()
  })

  it("tidak menampilkan enum mentah atau nama field database", async () => {
    mockFetchOk()
    const { container } = render(<ReservationDetail id={91} />)

    await screen.findByText("Aula Utama")
    const teks = container.textContent ?? ""
    for (const mentah of ["PENDING", "tujuanPenggunaan", "submittedAt", "processedAt"]) {
      expect(teks).not.toContain(mentah)
    }
  })

  it("tombol destruktif memakai varian danger dan target sentuh minimal", async () => {
    mockFetchOk()
    render(<ReservationDetail id={91} />)

    await screen.findByText("Aula Utama")
    const batalkan = screen.getByRole("button", { name: "Batalkan reservasi" })
    expect(batalkan).toHaveClass("bg-destructive-subdued")
    expect(batalkan).toHaveClass("min-h-11")
  })

  it("menampilkan alasan dengan label Alasan saat tersedia (RES-03)", async () => {
    mockFetchOk({
      ...data,
      status: "REJECTED",
      alasan: "Kapasitas tidak mencukupi",
      processedAt: "2026-12-01T02:00:00.000Z",
      processedBy: 7,
    } as unknown as ReservationResult)
    render(<ReservationDetail id={91} />)

    await screen.findByText("Aula Utama")
    expect(screen.getByText("Alasan")).toBeInTheDocument()
    expect(screen.getByText("Kapasitas tidak mencukupi")).toBeInTheDocument()
    expect(screen.queryByText("Batalkan reservasi")).not.toBeInTheDocument()
  })

  it("menampilkan status Dibatalkan Petugas dan alasan pembatalan mendesak (RES-07)", async () => {
    mockFetchOk({
      ...data,
      status: "CANCELLED_BY_OFFICER",
      alasan: "Dibatalkan karena perbaikan mendadak pada fasilitas",
      processedAt: "2026-12-01T02:00:00.000Z",
      processedBy: 7,
    } as unknown as ReservationResult)
    render(<ReservationDetail id={91} />)

    await screen.findByText("Aula Utama")
    expect(screen.getAllByText("Dibatalkan Petugas").length).toBeGreaterThan(0)
    expect(screen.getByText("Alasan")).toBeInTheDocument()
    expect(screen.getByText("Dibatalkan karena perbaikan mendadak pada fasilitas")).toBeInTheDocument()
    expect(screen.queryByText("Batalkan reservasi")).not.toBeInTheDocument()
  })

  it("lolos pemeriksaan aksesibilitas", async () => {
    mockFetchOk()
    const { container } = render(<ReservationDetail id={91} />)

    await screen.findByText("Aula Utama")
    expect((await axe(container)).violations).toEqual([])
  })
})


describe("ReservationDetail loading", () => {
  it("menampilkan skeleton dan status sebelum detail tiba", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    render(<ReservationDetail id={7} />);

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat detail reservasi");
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
