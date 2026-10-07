import { describe, expect, it } from "vitest"
import { Circle, History, RotateCcwClock } from "lucide-react"

import { adminNavigation } from "@/config/admin-navigation"
import { staffNavigation, staffQueueNavigation } from "@/components/staff/navigation"
import { navigation } from "@/config/navigation"
import { navigationIconName, resolveNavigationIcon } from "@/components/app-shell/navigation-icons"

const navigationConfigs = [
  ["pengguna", navigation],
  ["petugas", staffNavigation],
  ["antrean petugas", staffQueueNavigation],
  ["admin", adminNavigation],
] as const

describe("ikon navigasi", () => {
  it("memetakan alias Lucide History ke ikon jam riwayat", () => {
    expect(navigationIconName(History)).toBe("RotateCcwClock")
    expect(resolveNavigationIcon(navigationIconName(History))).toBe(RotateCcwClock)
  })

  it.each(navigationConfigs)("mendaftarkan setiap ikon navigasi %s", (name, groups) => {
    const unresolvedItems = groups.flatMap((group) =>
      group.items.flatMap((item) => {
        const iconName = navigationIconName(item.icon)
        return resolveNavigationIcon(iconName) === Circle
          ? [`${name}: ${item.label} (${iconName})`]
          : []
      }),
    )

    expect(unresolvedItems).toEqual([])
  })
})
