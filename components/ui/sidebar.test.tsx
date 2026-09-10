import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"
import {
  Sidebar,
  SidebarMenuAction,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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

  it("menggunakan accessible name bahasa Indonesia pada sidebar dan sheet", async () => {
    setMatchMedia("(max-width: 1023px)", true)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar>
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
    expect(dialog).toHaveTextContent("Menampilkan navigasi utama pada perangkat seluler.")
    expect(screen.getByRole("button", { name: "Tutup" })).toBeInTheDocument()
    expect(screen.queryByText("Sidebar")).not.toBeInTheDocument()
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
