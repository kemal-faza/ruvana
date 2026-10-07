import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { logoutFromBrowser } from "@/lib/auth-client"
import AdminSidebar from "@/components/admin/Sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const { mockPathname } = vi.hoisted(() => ({ mockPathname: vi.fn(() => "/admin/pengguna") }))
type TestLinkProps = ComponentProps<"a"> & { href: string }

vi.mock("next/link", () => ({
  default: ({ href, onClick, ...props }: TestLinkProps) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    />
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: mockPathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
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
    mockPathname.mockReturnValue("/admin/pengguna")
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
    expect(
      Array.from(screen.getByRole("navigation", { name: "Navigasi utama" }).querySelectorAll("a"), (link) =>
        link.textContent?.trim(),
      ),
    ).toEqual(["Analitik", "Kelola Fasilitas", "Kelola Pengguna", "Pengaturan"])
    expect(screen.getByText("Sistem")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pengaturan" })).toHaveAttribute("href", "/admin/pengaturan")

    expect(screen.getByRole("link", { name: "Ruvana" })).toHaveAttribute("href", "/")
    expect(screen.getByText("Administrasi")).toBeInTheDocument()
    expect(screen.queryByText("Pengelolaan fasilitas")).not.toBeInTheDocument()

    expect(screen.getByText("Ayu Pratama")).toBeInTheDocument()
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("button", { name: "Gunakan tema gelap" })).toBeInTheDocument()
    const tombolKeluar = screen.getByRole("button", { name: "Keluar" })
    expect(tombolKeluar).toHaveAttribute("type", "button")
    await user.click(tombolKeluar)
    expect(logoutFromBrowser).toHaveBeenCalledOnce()
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeInTheDocument()
  })

  it("menampilkan kegagalan logout sebagai alert yang dapat dikenali", async () => {
    vi.mocked(logoutFromBrowser).mockRejectedValueOnce(new Error("session unavailable"))
    setMatchMedia("(max-width: 1023px)", false)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <AdminSidebar admin={{ id: 1, nama: "Ayu Pratama", email: "ayu@kampus.ac.id", role: "admin" }} />
      </SidebarProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Keluar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal keluar. Coba lagi.")
  })

  it("menutup drawer Admin setelah memilih tujuan navigasi", async () => {
    mockPathname.mockReturnValue("/admin/pengguna")
    setMatchMedia("(max-width: 1023px)", true)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <SidebarTrigger />
        <AdminSidebar admin={{ id: 1, nama: "Ayu Pratama", email: "ayu@kampus.ac.id", role: "admin" }} />
      </SidebarProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Buka navigasi" }))
    await screen.findByRole("dialog", { name: "Navigasi utama" })
    await user.click(screen.getByRole("link", { name: "Analitik" }))

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi utama" })).not.toBeInTheDocument())
  })

  it("menyediakan Analitik dan menandainya aktif pada halaman dashboard", () => {
    mockPathname.mockReturnValue("/admin/analitik")
    setMatchMedia("(max-width: 1023px)", false)
    render(
      <SidebarProvider>
        <AdminSidebar admin={{ id: 1, nama: "Ayu Pratama", email: "ayu@kampus.ac.id", role: "admin" }} />
      </SidebarProvider>,
    )

    const tautan = screen.getByRole("link", { name: "Analitik" })
    expect(tautan).toHaveAttribute("href", "/admin/analitik")
    expect(tautan).toHaveAttribute("aria-current", "page")
  })

  it("menandai Pengaturan aktif pada halaman pengaturan admin", () => {
    mockPathname.mockReturnValue("/admin/pengaturan")
    setMatchMedia("(max-width: 1023px)", false)
    render(
      <SidebarProvider>
        <AdminSidebar admin={{ id: 1, nama: "Ayu Pratama", email: "ayu@kampus.ac.id", role: "admin" }} />
      </SidebarProvider>,
    )

    const tautan = screen.getByRole("link", { name: "Pengaturan" })
    expect(tautan).toHaveAttribute("href", "/admin/pengaturan")
    expect(tautan).toHaveAttribute("aria-current", "page")
  })
})
