import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn() }))

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/pengaturan",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

import PengaturanLayout from "./layout"

afterEach(() => {
  cleanup()
  resetMatchMedia()
  vi.clearAllMocks()
})

describe("PengaturanLayout", () => {
  it("menempatkan tautan lewati sebelum navigasi dan menargetkan main", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.getSessionUser.mockResolvedValue({
      id: 7,
      nama: "Siti Aminah",
      email: "siti@ruvana.test",
      role: Role.pengguna,
      status: AccountStatus.ACTIVE,
    })

    const { container } = render(await PengaturanLayout({ children: <main id="konten" tabIndex={-1}>Pengaturan</main> }))
    const skipLink = screen.getByRole("link", { name: "Lewati ke konten utama" })

    expect(container.querySelector("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")).toBe(skipLink)
    expect(skipLink).toHaveAttribute("href", "#konten")
    expect(screen.getByRole("main")).toHaveAttribute("id", "konten")
    expect((await axe(container)).violations).toEqual([])
  })
})
