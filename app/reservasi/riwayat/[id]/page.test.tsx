import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  usePathname: () => "/reservasi/riwayat/91",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

import RiwayatDetailPage from "@/app/reservasi/riwayat/[id]/page"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function mockFetchDetailKosong() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ detail: "tak ada" }), { status: 404 })),
  )
}

describe("RiwayatDetailPage banner pengajuan", () => {
  it("menampilkan banner sukses saat dibuka dengan param baru=1", async () => {
    mockFetchDetailKosong()

    render(
      await RiwayatDetailPage({
        params: Promise.resolve({ id: "91" }),
        searchParams: Promise.resolve({ baru: "1" }),
      }),
    )

    expect(await screen.findByRole("heading", { name: "Reservasi berhasil diajukan" })).toBeInTheDocument()
  })

  it("tidak menampilkan banner saat dibuka dari riwayat tanpa param", async () => {
    mockFetchDetailKosong()

    render(
      await RiwayatDetailPage({
        params: Promise.resolve({ id: "91" }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(await screen.findByText("Reservasi tidak ditemukan")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Reservasi berhasil diajukan" })).not.toBeInTheDocument()
  })

  it("tidak merender shell karena disediakan layout segmen", async () => {
    mockFetchDetailKosong()

    render(
      await RiwayatDetailPage({
        params: Promise.resolve({ id: "91" }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument()
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })
})
