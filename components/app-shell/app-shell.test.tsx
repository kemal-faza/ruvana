import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { CalendarDays, History, LayoutDashboard, Settings } from "lucide-react"

import { logoutFromBrowser } from "@/lib/auth-client"
import { AppShell } from "@/components/app-shell/app-shell"
import type { NavigationGroup } from "@/components/app-shell/types"
import { staffNavigation } from "@/components/staff/navigation"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const routeState = vi.hoisted(() => ({ pathname: "/reservasi" }))

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.pathname,
}))
vi.mock("@/lib/auth-client", () => ({ logoutFromBrowser: vi.fn() }))

const navigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "ringkasan", label: "Ringkasan", href: "/", icon: LayoutDashboard },
      { key: "reservasi", label: "Reservasi", href: "/reservasi", icon: CalendarDays, exact: true },
      { key: "riwayat", label: "Reservasi Saya", href: "/reservasi/riwayat", icon: History },
    ],
  },
  {
    key: "pengaturan",
    label: "Pengaturan",
    items: [{ key: "pengaturan", label: "Pengaturan", href: "/pengaturan", icon: Settings }],
  },
]

function renderFixture() {
  return render(
    <AppShell
      navigation={navigation}
      account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }}
    >
      <p>Pratinjau UI</p>
    </AppShell>,
  )
}

describe("AppShell", () => {
  afterEach(() => {
    cleanup()
    resetMatchMedia()
    routeState.pathname = "/reservasi"
  })

  it("merender navigasi aktif dan mengirim logout lewat API", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    const user = userEvent.setup()
    const { container } = renderFixture()

    expect(screen.getAllByRole("link", { name: "Reservasi" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByText("Pratinjau UI")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka navigasi" })).not.toBeInTheDocument()
    const tombolKeluar = screen.getAllByRole("button", { name: "Keluar" })[0]
    expect(tombolKeluar).toHaveAttribute("type", "button")
    await user.click(tombolKeluar)
    expect(logoutFromBrowser).toHaveBeenCalledOnce()
    expect((await axe(container)).violations).toEqual([])
  })

  it("menampilkan masuk dan menyembunyikan logout saat tidak ada sesi", () => {
    setMatchMedia("(max-width: 1023px)", false)
    render(
      <AppShell navigation={navigation} account={null}>
        <p>Pratinjau UI</p>
      </AppShell>,
    )

    expect(screen.getByText("Pengunjung")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login")
    expect(screen.queryByRole("button", { name: "Keluar" })).not.toBeInTheDocument()
  })

  it("memberi stagger CSS pada butir navigasi tanpa menyembunyikan konten", () => {
    setMatchMedia("(max-width: 1023px)", false)
    const { container } = renderFixture()

    const staggerNodes = Array.from(
      container.querySelectorAll<HTMLElement>(".motion-rise-stagger"),
    )
    expect(staggerNodes.length).toBeGreaterThan(0)
    expect(staggerNodes.every((node) => node.style.getPropertyValue("--stagger-index") !== "")).toBe(true)
  })

  it("menjaga sidebar desktop terbuka tanpa shortcut Ctrl atau Cmd+B", () => {
    setMatchMedia("(max-width: 1023px)", false)
    renderFixture()
    const navigationElement = screen.getByRole("navigation", { name: "Navigasi utama" })

    expect(navigationElement).toBeVisible()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", metaKey: true }))
    expect(navigationElement).toBeVisible()
  })

  it("menjebak fokus di drawer, menutup dengan Escape, dan mengembalikan fokus", async () => {
    setMatchMedia("(max-width: 1023px)", true)
    const user = userEvent.setup()
    renderFixture()

    const trigger = screen.getByRole("button", { name: "Buka navigasi" })
    await user.click(trigger)
    const dialog = await screen.findByRole("dialog", { name: "Navigasi utama" })
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    for (let index = 0; index < focusableElements.length + 1; index += 1) {
      await user.tab()
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    }

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi utama" })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    const reopenedDialog = await screen.findByRole("dialog", { name: "Navigasi utama" })
    await user.click(within(reopenedDialog).getByRole("link", { name: "Reservasi" }))
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi utama" })).not.toBeInTheDocument())
  })

  it("hanya menandai Reservasi Saya di route anak tanpa double-active Reservasi", () => {
    setMatchMedia("(max-width: 1023px)", false)
    routeState.pathname = "/reservasi/riwayat"
    renderFixture()

    expect(screen.getAllByRole("link", { name: "Reservasi Saya" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getAllByRole("link", { name: "Reservasi" })[0]).not.toHaveAttribute("aria-current")
  })

  it("memindahkan active state ketika pathname berubah tanpa filter role", () => {
    setMatchMedia("(max-width: 1023px)", false)
    const view = renderFixture()

    routeState.pathname = "/pengaturan"
    view.rerender(
      <AppShell
        navigation={navigation}
        account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }}
      >
        <p>Pratinjau UI</p>
      </AppShell>,
    )

    expect(screen.getAllByRole("link", { name: "Pengaturan" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getAllByRole("link", { name: "Reservasi" })[0]).not.toHaveAttribute("aria-current")
  })

  it("menandai lokasi dashboard Petugas dan hanya menampilkan tujuan yang tersedia", () => {
    setMatchMedia("(max-width: 1023px)", false)
    routeState.pathname = "/petugas"
    const { rerender } = render(
      <AppShell navigation={staffNavigation} account={{ displayName: "Siti", roleLabel: "Petugas" }}>
        <p>Dashboard</p>
      </AppShell>,
    )

    expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Persetujuan reservasi" })).toHaveAttribute(
      "href",
      "/petugas/antrian",
    )
    expect(screen.queryByRole("link", { name: "Laporan" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Fasilitas" })).not.toBeInTheDocument()

    routeState.pathname = "/petugas/antrian"
    rerender(
      <AppShell navigation={staffNavigation} account={{ displayName: "Siti", roleLabel: "Petugas" }}>
        <p>Antrean</p>
      </AppShell>,
    )
    expect(screen.getAllByRole("link", { name: "Persetujuan reservasi" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})
