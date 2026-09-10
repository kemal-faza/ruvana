import * as React from "react"

import {
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip"

export type SidebarMenuTooltip = string | React.ComponentProps<typeof TooltipContent>

export function normalizeSidebarTooltip(tooltip: SidebarMenuTooltip) {
  return typeof tooltip === "string" ? { children: tooltip } : tooltip
}

export function renderSidebarMenuButtonTooltip({
  component,
  tooltip,
  hidden,
}: {
  component: React.ReactNode
  tooltip: SidebarMenuTooltip | undefined
  hidden: boolean
}) {
  if (!tooltip) return component

  return (
    <Tooltip>
      {component}
      <TooltipContent
        side="right"
        align="center"
        hidden={hidden}
        {...normalizeSidebarTooltip(tooltip)}
      />
    </Tooltip>
  )
}
