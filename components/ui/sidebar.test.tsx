import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"
import {
  Sidebar,
  SidebarGroupAction,
  SidebarMenuAction,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"

describe("aksesibilitas sidebar", () => {
  beforeEach(() => {
    resetMatchMedia()
  })

  afterEach(() => {
    cleanup()
    resetMatchMedia()
  })

  it("memberi target desktop SidebarMenuAction minimal 24 piksel", () => {
    render(
      <SidebarProvider>
        <SidebarMenuAction aria-label="Aksi menu" />
      </SidebarProvider>,
    )

    expect(screen.getByRole("button", { name: "Aksi menu" })).toHaveClass("size-6")
  })

  it("memberi target desktop SidebarGroupAction minimal 24 piksel", () => {
    render(
      <SidebarProvider>
        <SidebarGroupAction aria-label="Aksi grup" />
      </SidebarProvider>,
    )

    expect(screen.getByRole("button", { name: "Aksi grup" })).toHaveClass("size-6")
  })

  it("menggunakan accessible name bahasa Indonesia pada sidebar dan sheet", async () => {
    setMatchMedia("(max-width: 1023px)", true)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar className="mobile-sidebar-custom">
          <p>Menu navigasi</p>
        </Sidebar>
        <SidebarRail />
      </SidebarProvider>,
    )

    const trigger = screen.getByRole("button", { name: "Buka navigasi" })
    expect(screen.getByRole("button", { name: "Alihkan navigasi utama" })).toHaveAttribute(
      "title",
      "Alihkan navigasi utama",
    )
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Navigasi utama" })
    expect(dialog).toHaveClass("mobile-sidebar-custom")
    expect(dialog).toHaveTextContent("Menampilkan navigasi utama pada perangkat seluler.")
    expect(screen.getByRole("button", { name: "Tutup" })).toBeInTheDocument()
    expect(screen.queryByText("Sidebar")).not.toBeInTheDocument()
  })

  it("menutup drawer dengan Escape dan tombol tutup serta mengembalikan fokus ke pemicu", async () => {
    setMatchMedia("(max-width: 1023px)", true)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar>
          <p>Menu navigasi</p>
        </Sidebar>
      </SidebarProvider>,
    )

    const trigger = screen.getByRole("button", { name: "Buka navigasi" })
    await user.click(trigger)

    const drawer = await screen.findByRole("dialog", { name: "Navigasi utama" })
    expect(drawer).toHaveClass("duration-motion-standard", "ease-motion-standard", "motion-reduce:transition-none")
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass(
      "duration-motion-standard",
      "motion-reduce:transition-none",
    )

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi utama" })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await screen.findByRole("dialog", { name: "Navigasi utama" })
    await user.click(screen.getByRole("button", { name: "Tutup" }))
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi utama" })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it("mempertahankan durasi expressive pada Sheet non-navigasi", () => {
    render(
      <Sheet open>
        <SheetContent aria-label="Sheet detail">Detail umum</SheetContent>
      </Sheet>,
    )

    expect(screen.getByRole("dialog", { name: "Sheet detail" })).toHaveClass(
      "duration-motion-expressive",
      "ease-motion-emphatic",
    )
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass("duration-150")
  })

  it("menggunakan lebar skeleton deterministik", () => {
    render(
      <SidebarProvider>
        <SidebarMenuSkeleton />
      </SidebarProvider>,
    )

    expect(document.querySelector('[data-sidebar="menu-skeleton-text"]')).toHaveClass("w-3/4")
  })

  it("mempertahankan opsi collapsible pada API publik desktop", () => {
    setMatchMedia("(max-width: 1023px)", false)

    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon" />
      </SidebarProvider>,
    )

    expect(document.querySelector('[data-slot="sidebar"][data-side]')).toHaveAttribute(
      "data-collapsible",
      "icon",
    )
  })
})
