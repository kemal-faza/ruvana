import Link from "next/link"
import { Check, TriangleAlert, X } from "lucide-react"

import { LABEL_STATUS_SLOT } from "@/config/labels"
import type { AvailabilitySlot } from "@/lib/availability/slots"

interface AvailabilityGridProps {
  slots: AvailabilitySlot[]
  /**
   * Bangun tautan untuk slot tersedia. Kembalikan null bila slot tidak boleh
   * diklik (mis. peran petugas/admin). Tanpa prop ini seluruh slot statis.
   */
  slotHref?: (slot: AvailabilitySlot) => string | null
}

function slotLabel(slot: AvailabilitySlot): string {
  if (slot.available) return LABEL_STATUS_SLOT.available
  if (slot.blockedBy === "MAINTENANCE") return LABEL_STATUS_SLOT.blockedMaintenance
  return LABEL_STATUS_SLOT.blockedApproved
}

const slotBoxClass =
  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control border p-2 text-center"
const availableClass = "border-transparent bg-success-subdued text-success-subdued-foreground"
const blockedClass = "border-border bg-muted text-muted-foreground"

export function AvailabilityGrid({ slots, slotHref }: AvailabilityGridProps) {
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
          const href = slot.available && slotHref ? slotHref(slot) : null

          const content = (
            <>
              <span className="flex items-center gap-1 text-sm font-medium">
                <Icon aria-hidden="true" className="size-3.5" />
                {slot.startTime}
              </span>
              <span className="text-xs leading-none">{label}</span>
            </>
          )

          return (
            <li key={slot.startTime}>
              {href ? (
                <Link
                  href={href}
                  className={`${slotBoxClass} ${availableClass} transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-disabled={!slot.available}
                  className={`${slotBoxClass} ${slot.available ? availableClass : blockedClass}`}
                >
                  {content}
                </div>
              )}
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
