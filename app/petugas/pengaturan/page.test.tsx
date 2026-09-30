import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const { requirePetugas } = vi.hoisted(() => ({ requirePetugas: vi.fn() }))
vi.mock("@/lib/auth", () => ({ requirePetugas }))

import PengaturanPetugasPage from "@/app/petugas/pengaturan/page"

beforeEach(() => vi.clearAllMocks())

describe("PengaturanPetugasPage", () => {
  it("menampilkan profil petugas setelah pemeriksaan akses", async () => {
    requirePetugas.mockResolvedValue({
      id: 9,
      nama: "Budi Petugas",
      email: "budi@kampus.ac.id",
      role: "petugas",
    })

    render(await PengaturanPetugasPage())

    expect(requirePetugas).toHaveBeenCalledOnce()
    expect(screen.getByLabelText(/Nama/)).toHaveValue("Budi Petugas")
    expect(screen.getByText("Petugas")).toBeInTheDocument()
  })

  it("meneruskan penolakan pemeriksaan akses", async () => {
    requirePetugas.mockRejectedValue(new Error("redirect:/403"))

    await expect(PengaturanPetugasPage()).rejects.toThrow("redirect:/403")
  })
})
