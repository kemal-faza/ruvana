import { cn } from "cn"

import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button"
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
          <Button
            key={filter}
            type="button"
            variant={selected ? "primary" : "outline"}
            aria-pressed={selected}
            aria-label={`${label}, ${count} laporan`}
            onClick={() => onChange(filter)}
            className={cn(
              BUTTON_ACTION_CLASS,
              !selected && "text-muted-foreground hover:text-foreground",
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
          </Button>
        )
      })}
    </div>
  )
}
