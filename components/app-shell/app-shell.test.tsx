import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { CalendarDays, History, LayoutDashboard, Settings } from "lucide-react"

import { AppShell } from "@/components/app-shell/app-shell"
import type { NavigationGroup } from "@/components/app-shell/types"
import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"

const routeState = vi.hoisted(() => ({ pathname: "/reservasi" }))

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.pathname,
}))

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
      logoutDestination="/keluar"
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

  it("merender navigasi aktif, outlet, dan logout sebagai link biasa", async () => {
    setMatchMedia("(max-width: 1023px)", false)
    const { container } = renderFixture()

    expect(screen.getAllByRole("link", { name: "Reservasi" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByText("Pratinjau UI")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Buka navigasi" })).not.toBeInTheDocument()
    const logout = screen.getAllByRole("link", { name: "Keluar" })[0]
    expect(logout).toHaveAttribute("href", "/keluar")
    expect(logout).not.toHaveAttribute("type")
    // Link tetap dapat fokus; jangan matikan outline tanpa indikator pengganti.
    expect(logout.className).not.toMatch(/outline-none/)
    expect((await axe(container)).violations).toEqual([])
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
        logoutDestination="/keluar"
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
})
