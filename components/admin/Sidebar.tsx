"use client"

import { LogOut } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { logoutFromBrowser } from "@/lib/auth-client"
import { NavigationList } from "@/components/app-shell/app-sidebar"
import { adminNavigation } from "@/config/admin-navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/auth"

export default function AdminSidebar({ admin }: { admin: SessionUser }) {
  const { setOpenMobile } = useSidebar()
  const router = useRouter()
  const [logoutError, setLogoutError] = useState("")

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/"
          onClick={() => setOpenMobile(false)}
          className="flex min-h-11 items-center gap-2 rounded-md px-2 text-lg font-semibold"
        >
          <span>Ruvana</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavigationList navigation={adminNavigation} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{admin.nama}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">Admin</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={async () => {
            try {
              setLogoutError("")
              await logoutFromBrowser(router)
              setOpenMobile(false)
            } catch {
              setLogoutError("Gagal keluar. Coba lagi.")
            }
          }}
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          <span>Keluar</span>
        </button>
        {logoutError && <p role="alert" className="text-xs text-destructive">{logoutError}</p>}
      </SidebarFooter>
    </Sidebar>
  )
}
