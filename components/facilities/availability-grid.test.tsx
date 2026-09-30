import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AvailabilityGrid } from "./availability-grid"
import type { AvailabilitySlot } from "@/lib/availability/slots"
import { generateDailySlots } from "@/lib/availability/slots"

afterEach(cleanup)

const availableSlots: AvailabilitySlot[] = generateDailySlots().map((slot) => ({
  ...slot,
  available: true,
  blockedBy: null,
}))

function withBlockedSlot(startTime: string, blockedBy: "APPROVED" | "MAINTENANCE"): AvailabilitySlot[] {
  return availableSlots.map((slot) =>
    slot.startTime === startTime ? { ...slot, available: false, blockedBy } : slot,
  )
}

describe("AvailabilityGrid", () => {
  it("menampilkan tepat 26 slot", () => {
    render(<AvailabilityGrid slots={availableSlots} />)

    expect(screen.getAllByText(/^(07|08|09|1\d|20):(00|30)$/)).toHaveLength(26)
  })

  it("menampilkan label 'Tersedia' untuk slot yang tersedia", () => {
    render(<AvailabilityGrid slots={availableSlots} />)

    expect(screen.getAllByText("Tersedia").length).toBeGreaterThan(0)
  })

  it("menampilkan label 'Tidak tersedia' dan aria-disabled pada slot yang diblokir APPROVED", () => {
    const slots = withBlockedSlot("08:00", "APPROVED")
    render(<AvailabilityGrid slots={slots} />)

    const blockedItem = screen.getByText("08:00").closest('[aria-disabled="true"]')
    expect(blockedItem).not.toBeNull()
    expect(blockedItem).toHaveTextContent("Tidak tersedia")
  })

  it("menampilkan pesan maintenance ketika semua slot MAINTENANCE", () => {
    const slots: AvailabilitySlot[] = availableSlots.map((slot) => ({
      ...slot,
      available: false,
      blockedBy: "MAINTENANCE",
    }))
    render(<AvailabilityGrid slots={slots} />)

    expect(screen.getByText(/sedang dalam perbaikan/i)).toBeInTheDocument()
  })

  it("tidak menampilkan pesan maintenance ketika fasilitas aktif", () => {
    render(<AvailabilityGrid slots={availableSlots} />)

    expect(screen.queryByText(/sedang dalam perbaikan/i)).not.toBeInTheDocument()
  })
})
