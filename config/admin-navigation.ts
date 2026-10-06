import { Building2, ChartPie, Settings, Users } from "lucide-react"

import type { NavigationGroup } from "@/components/app-shell/types"

export const adminNavigation: readonly NavigationGroup[] = [
  {
    key: "kelola",
    label: "Kelola",
    items: [
      { key: "admin-analytics", label: "Analitik", href: "/admin/analitik", icon: ChartPie },
      { key: "admin-facilities", label: "Kelola Fasilitas", href: "/admin/fasilitas", icon: Building2 },
      { key: "admin-users", label: "Kelola Pengguna", href: "/admin/pengguna", icon: Users },
    ],
  },
  {
    key: "sistem",
    label: "Sistem",
    items: [{ key: "admin-settings", label: "Pengaturan", href: "/admin/pengaturan", icon: Settings }],
  },
]
