import * as React from "react"
import { describe, expect, it } from "vitest"

import {
  normalizeSidebarTooltip,
  renderSidebarMenuButtonTooltip,
} from "@/components/ui/sidebar-menu-helpers"
import { Tooltip } from "@/components/ui/tooltip"

describe("helper tooltip SidebarMenuButton", () => {
  it("menormalkan tooltip string menjadi children", () => {
    expect(normalizeSidebarTooltip("Bantuan")).toEqual({ children: "Bantuan" })
  })

  it("mempertahankan konfigurasi tooltip terstruktur", () => {
    const tooltip = { children: "Bantuan", side: "bottom" as const }

    expect(normalizeSidebarTooltip(tooltip)).toBe(tooltip)
  })

  it("mengembalikan komponen tanpa pembungkus saat tooltip tidak tersedia", () => {
    const component = <span data-testid="menu-button" />

    expect(
      renderSidebarMenuButtonTooltip({
        component,
        tooltip: undefined,
        hidden: true,
      }),
    ).toBe(component)
  })

  it("merender TooltipContent tersembunyi saat sidebar diciutkan", () => {
    const component = <span data-testid="menu-button" />
    const rendered = renderSidebarMenuButtonTooltip({
      component,
      tooltip: "Bantuan",
      hidden: false,
    })

    expect(React.isValidElement(rendered)).toBe(true)
    const element = rendered as React.ReactElement<{ children: React.ReactNode }>
    expect(element.type).toBe(Tooltip)
    expect(React.Children.count(element.props.children)).toBe(2)
  })
})
