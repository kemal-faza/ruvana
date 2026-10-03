import {
  Building2,
  CalendarDays,
  ChartPie,
  Circle,
  ClipboardList,
  LayoutDashboard,
  RotateCcwClock,
  Settings,
  SwatchBook,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { NavigationItem } from "@/components/app-shell/types"

const iconRegistry: Readonly<Record<string, LucideIcon>> = {
  Building2,
  CalendarDays,
  ChartPie,
  ClipboardList,
  LayoutDashboard,
  RotateCcwClock,
  Settings,
  SwatchBook,
  Users,
}

export function navigationIconName(icon: LucideIcon): string {
  return icon.displayName ?? icon.name
}

export function resolveNavigationIcon(icon: NavigationItem["icon"] | string): LucideIcon {
  return typeof icon === "string" ? iconRegistry[icon] ?? Circle : icon
}
