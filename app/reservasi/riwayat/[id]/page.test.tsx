import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Role } from "@/generated/prisma/enums"

const { requirePengguna } = vi.hoisted(() => ({ requirePengguna: vi.fn() }))

vi.mock("@/lib/auth", () => ({ requirePengguna }))
vi.mock("next/navigation", () => ({
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
    requirePengguna.mockResolvedValue({ id: 1, nama: "Siti Aminah", email: "siti@example.com", role: Role.pengguna })
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
    requirePengguna.mockResolvedValue({ id: 1, nama: "Siti Aminah", email: "siti@example.com", role: Role.pengguna })
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
})
