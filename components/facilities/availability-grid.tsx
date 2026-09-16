import { Check, TriangleAlert, X } from "lucide-react"

import { LABEL_STATUS_SLOT } from "@/config/labels"
import type { AvailabilitySlot } from "@/lib/availability/slots"

interface AvailabilityGridProps {
  slots: AvailabilitySlot[]
}

function slotLabel(slot: AvailabilitySlot): string {
  if (slot.available) return LABEL_STATUS_SLOT.available
  if (slot.blockedBy === "MAINTENANCE") return LABEL_STATUS_SLOT.blockedMaintenance
  return LABEL_STATUS_SLOT.blockedApproved
}

export function AvailabilityGrid({ slots }: AvailabilityGridProps) {
  const isMaintenance = slots.length > 0 && slots.every((slot) => slot.blockedBy === "MAINTENANCE")

  return (
    <div className="flex flex-col gap-4">
      {isMaintenance && (
        <p className="flex items-center gap-2 rounded-card border border-border bg-warning-subdued px-4 py-3 text-sm text-warning-subdued-foreground">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span>Fasilitas sedang dalam perbaikan, semua slot tidak tersedia.</span>
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot) => {
          const label = slotLabel(slot)
          const Icon = slot.available ? Check : X

          return (
            <li key={slot.startTime}>
              <div
                aria-disabled={!slot.available}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control border px-2 py-2 text-center ${
                  slot.available
                    ? "border-transparent bg-success-subdued text-success-subdued-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-1 text-sm font-medium">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {slot.startTime}
                </span>
                <span className="text-[11px] leading-none">{label}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Check aria-hidden="true" className="size-3.5" />
          {LABEL_STATUS_SLOT.available}
        </span>
        <span className="flex items-center gap-1">
          <X aria-hidden="true" className="size-3.5" />
          {LABEL_STATUS_SLOT.blockedApproved}
        </span>
      </div>
    </div>
  )
}
