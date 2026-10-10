import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { ReservationHistoryList } from "@/components/reservation/reservation-history-list"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

const BODY_DUA_HALAMAN = (halaman: number) => ({
  items: [SATU_ITEM],
  meta: { page: halaman, perPage: 10, totalItems: 25, totalPages: 3 },
})

async function pilihFilter(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Filter status" }))
  await user.click(await screen.findByRole("option", { name: label }))
}

describe("ReservationHistoryList hardening", () => {
  it("error basi hilang dan data tampil saat filter diganti sesudah gagal", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("status=")
        ? new Response(JSON.stringify({ items: [SATU_ITEM], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }), { status: 200 })
        : new Response(JSON.stringify({ detail: "meledak" }), { status: 500 }),
    )
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    expect(await screen.findByText("Riwayat belum dapat dimuat.")).toBeInTheDocument()
    await pilihFilter(user, "Dibatalkan Petugas")

    expect(await screen.findByText("RK-102")).toBeInTheDocument()
    expect(screen.queryByText("Riwayat belum dapat dimuat.")).not.toBeInTheDocument()
  }, 20000)

  it("ganti filter selalu kembali ke halaman 1", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (url: unknown) => {
      const halaman = Number(new URL(String(url), "http://localhost").searchParams.get("page") ?? "1")
      return new Response(JSON.stringify(BODY_DUA_HALAMAN(halaman)), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    await user.click(screen.getByRole("button", { name: "Berikutnya" }))
    await screen.findByText("Halaman 2 dari 3")
    await pilihFilter(user, "Disetujui")

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("status=APPROVED"))
    })
    const terakhir = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[0] ?? "")
    expect(terakhir).toContain("page=1")
    expect(await screen.findByText("Halaman 1 dari 3")).toBeInTheDocument()
  }, 20000)

  it("401 menampilkan pesan sesi berakhir dengan tautan masuk", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
    render(<ReservationHistoryList />)

    expect(await screen.findByText("Sesi Anda berakhir. Silakan masuk lagi.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
  })

  it("422 khusus field status mereset ke Semua status dengan pemberitahuan", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (url: unknown) => {
      if (String(url).includes("status=REJECTED")) {
        return new Response(
          JSON.stringify({
            title: "Validasi gagal",
            detail: "x",
            errors: [{ field: "status", code: "INVALID_STATUS", message: "status harus salah satu dari: ..." }],
          }),
          { status: 422 },
        )
      }
      return new Response(
        JSON.stringify({ items: [SATU_ITEM], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    await pilihFilter(user, "Ditolak")

    expect(await screen.findByText(/tidak dikenal.*semua reservasi/i)).toBeInTheDocument()
    expect(await screen.findByText("RK-102")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    await waitFor(() => {
      const terakhir = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[0] ?? "")
      expect(terakhir).not.toContain("status=")
    })
  }, 20000)

  it("jaringan gagal atau 5xx menampilkan tombol coba lagi yang mengulang filter sama", async () => {
    const user = userEvent.setup()
    let gagal = true
    const fetchMock = vi.fn(async () => {
      if (gagal) return new Response(JSON.stringify({ detail: "x" }), { status: 500 })
      return new Response(
        JSON.stringify({ items: [SATU_ITEM], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    expect(await screen.findByText("Riwayat belum dapat dimuat.")).toBeInTheDocument()
    gagal = false
    await user.click(screen.getByRole("button", { name: "Coba lagi" }))

    expect(await screen.findByText("RK-102")).toBeInTheDocument()
    expect(screen.queryByText("Riwayat belum dapat dimuat.")).not.toBeInTheDocument()
  }, 20000)

  it("respons terlambat dari filter lama tidak menimpa hasil terbaru", async () => {
    const user = userEvent.setup()
    const kosong = { items: [], meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 } }
    let rilisBasi!: (nilai: Response) => void
    const janjiBasi = new Promise<Response>((r) => {
      rilisBasi = r
    })
    const fetchMock = vi.fn(async (url: unknown) => {
      const teks = String(url)
      if (teks.includes("status=PENDING")) return janjiBasi
      if (teks.includes("status=APPROVED")) {
        return new Response(
          JSON.stringify({ items: [{ ...SATU_ITEM, id: 99 }], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify(kosong), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    await screen.findByText("Belum ada reservasi")
    await pilihFilter(user, "Menunggu")
    await pilihFilter(user, "Disetujui")
    await screen.findByRole("button", { name: "Lihat detail" })
    rilisBasi(
      new Response(
        JSON.stringify({ items: [{ ...SATU_ITEM, id: 7 }], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
        { status: 200 },
      ),
    )

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3))
    expect(screen.getByRole("button", { name: "Lihat detail" })).toHaveAttribute("href", "/reservasi/riwayat/99")
    expect(screen.queryByText("Belum ada reservasi")).not.toBeInTheDocument()
  }, 20000)

  it("respons 200 tak sesuai kontrak menampilkan pesan muat ulang tanpa crash", async () => {
    const user = userEvent.setup()
    let rusak = true
    const fetchMock = vi.fn(async () => {
      if (rusak) return new Response(JSON.stringify({ items: null }), { status: 200 })
      return new Response(
        JSON.stringify({ items: [SATU_ITEM], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<ReservationHistoryList />)

    expect(await screen.findByText("Riwayat belum dapat dimuat.")).toBeInTheDocument()
    rusak = false
    await user.click(screen.getByRole("button", { name: "Coba lagi" }))
    expect(await screen.findByText("RK-102")).toBeInTheDocument()
  }, 20000)

  it("filter dapat dipakai keyboard dan lolos axe", async () => {
    const user = userEvent.setup()
    mockFetchRiwayat()
    const { container } = render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    await user.tab()
    expect(screen.getByRole("combobox", { name: "Filter status" })).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("option", { name: "Dibatalkan Petugas" })).toBeInTheDocument()
    expect((await axe(container)).violations).toEqual([])
  }, 20000)

  it("kotak error memakai live region dan lolos axe", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })))
    const { container } = render(<ReservationHistoryList />)

    const galat = await screen.findByRole("alert")
    expect(galat).toHaveTextContent("Riwayat belum dapat dimuat.")
    await user.click(within(galat).getByRole("button", { name: "Coba lagi" }))
    expect((await axe(container)).violations).toEqual([])
  }, 20000)
})


describe("ReservationHistoryList filter status tampil label domain (RES-03)", () => {
  const PASANGAN: Array<{ enum: string; label: string }> = [
    { enum: "PENDING", label: "Menunggu" },
    { enum: "APPROVED", label: "Disetujui" },
    { enum: "REJECTED", label: "Ditolak" },
    { enum: "CANCELLED_BY_USER", label: "Dibatalkan Pengguna" },
    { enum: "CANCELLED_BY_OFFICER", label: "Dibatalkan Petugas" },
    { enum: "CANCELLED_BY_MAINTENANCE", label: "Dibatalkan Pemeliharaan" },
    { enum: "EXPIRED", label: "Kedaluwarsa" },
  ]

  it("nilai awal menampilkan Semua status, bukan enum", async () => {
    mockFetchRiwayat()
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    const trigger = screen.getByRole("combobox", { name: "Filter status" })
    expect(trigger).toHaveTextContent("Semua status")
  })

  it.each(PASANGAN)("memilih $label menampilkan label, bukan enum $enum", async ({ label }) => {
    const user = userEvent.setup()
    const fetchMock = mockFetchRiwayat()
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    await user.click(screen.getByRole("combobox", { name: "Filter status" }))
    await user.click(await screen.findByRole("option", { name: label }))

    const trigger = screen.getByRole("combobox", { name: "Filter status" })
    await waitFor(() => {
      expect(trigger).toHaveTextContent(label)
    })
    for (const { enum: enumMentah } of PASANGAN) {
      expect(trigger.textContent ?? "").not.toContain(enumMentah)
    }
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("status="))
  }, 20000)
})

describe("ReservationHistoryList hierarki tombol", () => {
  it("aksi tunggal pada kotak sesi dan galat memakai varian primary", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
    const { unmount } = render(<ReservationHistoryList />)

    expect(await screen.findByRole("link", { name: "Masuk" })).toHaveClass("bg-primary-subdued")
    unmount()
    cleanup()

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })))
    render(<ReservationHistoryList />)

    expect(await screen.findByRole("button", { name: "Coba lagi" })).toHaveClass("bg-primary-subdued")
  })

  it("tombol paginasi memenuhi target sentuh minimal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(BODY_DUA_HALAMAN(1)), { status: 200 })),
    )
    render(<ReservationHistoryList />)

    await screen.findByText("RK-102")
    for (const nama of ["Sebelumnya", "Berikutnya"]) {
      expect(screen.getByRole("button", { name: nama })).toHaveClass("min-h-11")
    }
  })
})

describe("ReservationHistoryList loading", () => {
  it("menampilkan skeleton dan status saat data belum tiba", async () => {
    let rilisRespons: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => { rilisRespons = resolve; })),
    );

    render(<ReservationHistoryList />);

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat riwayat reservasi");
    expect(screen.queryByText("Memuat riwayat reservasi…")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);

    rilisRespons?.(new Response(JSON.stringify({
      items: [],
      meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 },
    }), { status: 200 }));

    expect(await screen.findByText("Belum ada reservasi")).toBeInTheDocument();
  });
});
