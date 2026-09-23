import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  SwatchBook,
} from "lucide-react"

import type { NavigationGroup, ShellAccount } from "@/components/app-shell/types"

export const navigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "ringkasan", label: "Ringkasan", href: "/", icon: LayoutDashboard },
      { key: "reservasi", label: "Reservasi", href: "/reservasi", icon: CalendarDays },
      { key: "fasilitas", label: "Fasilitas", href: "/fasilitas", icon: Building2 },
      { key: "laporan", label: "Laporan", href: "/reports", icon: ClipboardList },
    ],
  },
  {
    key: "sistem",
    label: "Sistem",
    items: [
      { key: "baseline-ui", label: "Baseline UI", href: "/baseline-ui", icon: SwatchBook },
      { key: "pengaturan", label: "Pengaturan", href: "/pengaturan", icon: Settings },
    ],
  },
]

export const shellAccount: ShellAccount = { displayName: "Ayu Pratama", roleLabel: "Pengguna" }

export const shellLogoutDestination = "/keluar"
