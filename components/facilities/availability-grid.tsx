import Link from "next/link"
import { Check, TriangleAlert, X, type LucideIcon } from "lucide-react"

import { LABEL_STATUS_SLOT } from "@/config/labels"
import type { AvailabilitySlot } from "@/lib/availability/slots"

export interface AvailabilitySelection {
  selectedStart: string | null
  selectedEnd: string | null
  /** Jam mulai yang dinonaktifkan (mis. slot dalam jendela pengajuan H-14). */
  disabledStarts?: ReadonlySet<string>
  onSelectSlot: (slot: AvailabilitySlot) => void
}

interface AvailabilityGridProps {
  slots: AvailabilitySlot[]
  /**
   * Bangun tautan untuk slot tersedia. Kembalikan null bila slot tidak boleh
   * diklik (mis. peran petugas/admin). Tanpa prop ini seluruh slot statis.
   */
  slotHref?: (slot: AvailabilitySlot) => string | null
  /** Mode pilih: slot tersedia dapat diklik untuk menentukan rentang jam. */
  selection?: AvailabilitySelection
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
const markedClass = "border-ring bg-success-subdued text-success-subdued-foreground"

function SlotContent({ startTime, label, Icon }: { startTime: string; label: string; Icon: LucideIcon }) {
  return (
    <>
      <span className="flex items-center gap-1 text-sm font-medium">
        <Icon aria-hidden="true" className="size-3.5" />
        {startTime}
      </span>
      <span className="text-xs leading-none">{label}</span>
    </>
  )
}

export function AvailabilityGrid({ slots, slotHref, selection }: AvailabilityGridProps) {
  const isMaintenance = slots.length > 0 && slots.every((slot) => slot.blockedBy === "MAINTENANCE")

  return (
    <div className="flex flex-col gap-4">
      {isMaintenance && (
        <p className="flex items-center gap-2 rounded-card border border-border bg-warning-subdued px-4 py-3 text-sm text-warning-subdued-foreground">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span>Fasilitas sedang dalam perbaikan, semua slot tidak tersedia.</span>
        </p>
      )}

      {selection && <p className="text-sm text-muted-foreground">Klik jam mulai, lalu klik jam selesai.</p>}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot) => {
          if (selection) {
            const disabled = !slot.available || (selection.disabledStarts?.has(slot.startTime) ?? false)
            const isRange =
              selection.selectedStart !== null &&
              selection.selectedEnd !== null &&
              slot.startTime >= selection.selectedStart &&
              slot.startTime < selection.selectedEnd
            const isStart = selection.selectedStart !== null && slot.startTime === selection.selectedStart
            const isEnd = selection.selectedEnd !== null && slot.startTime === selection.selectedEnd
            const marked = isRange || isStart || isEnd
            const boundary = isStart || isEnd
            const label = disabled && slot.available ? "Tidak tersedia" : slotLabel(slot)
            const Icon = disabled ? X : Check

            return (
              <li key={slot.startTime}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={!disabled && marked}
                  onClick={() => selection.onSelectSlot(slot)}
                  className={`${slotBoxClass} w-full cursor-pointer transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70 ${
                    disabled ? blockedClass : marked ? markedClass : availableClass
                  }${!disabled && boundary ? " ring-2 ring-ring/50" : ""}`}
                >
                  <SlotContent startTime={slot.startTime} label={label} Icon={Icon} />
                </button>
              </li>
            )
          }

          const label = slotLabel(slot)
          const Icon = slot.available ? Check : X
          const href = slot.available && slotHref ? slotHref(slot) : null

          return (
            <li key={slot.startTime}>
              {href ? (
                <Link
                  href={href}
                  className={`${slotBoxClass} ${availableClass} transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
                >
                  <SlotContent startTime={slot.startTime} label={label} Icon={Icon} />
                </Link>
              ) : (
                <div
                  aria-disabled={!slot.available}
                  className={`${slotBoxClass} ${slot.available ? availableClass : blockedClass}`}
                >
                  <SlotContent startTime={slot.startTime} label={label} Icon={Icon} />
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
