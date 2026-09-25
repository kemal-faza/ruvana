"use client"

import { ChartPie, LogOut, Users } from "lucide-react"
import { useState } from "react"

import { logoutFromBrowser } from "@/lib/auth-client"
import { NavigationList } from "@/components/app-shell/app-sidebar"
import type { NavigationGroup } from "@/components/app-shell/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/auth"

const NAVIGASI: readonly NavigationGroup[] = [
  {
    key: "kelola",
    label: "Kelola",
    items: [
      { key: "admin-users", label: "Kelola Pengguna", href: "/admin/pengguna", icon: Users },
      { key: "admin-analytics", label: "Analitik", href: "/admin/analitik", icon: ChartPie },
    ],
  },
]

function inisial(nama: string) {
  return nama
    .split(" ")
    .map((kata) => kata[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function AdminSidebar({ admin }: { admin: SessionUser }) {
  const { setOpenMobile } = useSidebar()
  const [logoutError, setLogoutError] = useState("")

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex min-h-11 flex-col justify-center px-2">
          <span className="text-sm font-semibold text-sidebar-foreground">Administrasi</span>
          <span className="text-xs text-sidebar-foreground/70">Pengelolaan fasilitas</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavigationList navigation={NAVIGASI} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {inisial(admin.nama)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{admin.nama}</span>
              <span className="block truncate text-xs text-sidebar-foreground/70">Admin</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={async () => {
            try {
              setLogoutError("")
              await logoutFromBrowser()
            } catch {
              setLogoutError("Gagal keluar. Coba lagi.")
            }
          }}
        >
          <LogOut aria-hidden="true" />
          <span>Keluar</span>
        </Button>
        {logoutError && <p role="alert" className="text-xs text-destructive">{logoutError}</p>}
      </SidebarFooter>
    </Sidebar>
  )
}
