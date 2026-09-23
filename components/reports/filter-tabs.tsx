import { cn } from "cn"

import { LABEL_STATUS_LAPORAN } from "@/config/labels"
import type { ReportStatus } from "@/lib/services/report-service"

export type ReportFilter = "ALL" | ReportStatus

const FILTER_ORDER: ReportFilter[] = ["ALL", "NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"]

interface FilterTabsProps {
  active: ReportFilter
  totalByStatus: Record<ReportStatus, number>
  total: number
  onChange: (filter: ReportFilter) => void
}

export function FilterTabs({ active, totalByStatus, total, onChange }: FilterTabsProps) {
  return (
    <div role="group" aria-label="Filter status laporan" className="flex flex-wrap gap-2">
      {FILTER_ORDER.map((filter) => {
        const selected = active === filter
        const count = filter === "ALL" ? total : totalByStatus[filter]
        const label = filter === "ALL" ? "Semua" : LABEL_STATUS_LAPORAN[filter]
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter)}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs font-medium",
                selected ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}