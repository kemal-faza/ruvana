import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { AccountStatus, Role } from "@/generated/prisma/enums"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))

vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analitik",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

import AdminLayout from "./layout"

afterEach(() => {
  cleanup()
  resetMatchMedia()
  vi.clearAllMocks()
})

describe("AdminLayout", () => {
  it("menempatkan tautan lewati sebelum sidebar dan menargetkan main", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    mocks.requireAdmin.mockResolvedValue({
      id: 1,
      nama: "Admin Ruvana",
      email: "admin@ruvana.test",
      role: Role.admin,
      status: AccountStatus.ACTIVE,
    })

    const { container } = render(await AdminLayout({ children: <main id="konten" tabIndex={-1}>Analitik</main> }))
    const skipLink = screen.getByRole("link", { name: "Lewati ke konten utama" })

    expect(container.querySelector("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")).toBe(skipLink)
    expect(skipLink).toHaveAttribute("href", "#konten")
    expect(screen.getByRole("main")).toHaveAttribute("id", "konten")
    expect((await axe(container)).violations).toEqual([])
  })
})
