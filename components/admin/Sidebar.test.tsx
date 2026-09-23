import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import AdminSidebar from "@/components/admin/Sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pengguna",
}))

vi.mock("@/app/login/actions", () => ({
  logout: vi.fn(),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
})

describe("AdminSidebar", () => {
  it("menampilkan navigasi aktif, identitas admin, dan tombol keluar", () => {
    setMatchMedia("(max-width: 1023px)", false)
    render(
      <SidebarProvider>
        <AdminSidebar
          admin={{ id: 1, nama: "Ayu Pratama", email: "ayu@kampus.ac.id", role: "admin" }}
        />
      </SidebarProvider>,
    )

    const tautan = screen.getByRole("link", { name: "Kelola Pengguna" })
    expect(tautan).toHaveAttribute("href", "/admin/pengguna")
    expect(tautan).toHaveAttribute("aria-current", "page")

    expect(screen.getByText("Ayu Pratama")).toBeInTheDocument()
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("button", { name: "Keluar" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeInTheDocument()
  })
})
