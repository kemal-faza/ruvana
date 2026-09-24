import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { logoutFromBrowser } from "@/lib/auth-client"
import AdminSidebar from "@/components/admin/Sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pengguna",
}))

vi.mock("@/lib/auth-client", () => ({
  logoutFromBrowser: vi.fn(),
}))

afterEach(() => {
  cleanup()
  resetMatchMedia()
})

describe("AdminSidebar", () => {
  it("menampilkan navigasi aktif, identitas admin, dan tombol keluar yang mencabut sesi", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    const user = userEvent.setup()
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
    const tombolKeluar = screen.getByRole("button", { name: "Keluar" })
    expect(tombolKeluar).toHaveAttribute("type", "button")
    await user.click(tombolKeluar)
    expect(logoutFromBrowser).toHaveBeenCalledOnce()
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeInTheDocument()
  })
})
