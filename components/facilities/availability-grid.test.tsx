import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

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

  it("menampilkan label status slot dengan ukuran metadata minimal 12 px", () => {
    const { container } = render(<AvailabilityGrid slots={[availableSlots[0]]} />)
    expect(container.querySelector("li span.text-xs")).toBeInTheDocument()
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

  it("menautkan slot tersedia ketika slotHref diberikan", () => {
    render(
      <AvailabilityGrid
        slots={[availableSlots[0]]}
        slotHref={(slot) => `/reservasi?startTime=${slot.startTime}`}
      />,
    )

    expect(screen.getByRole("link", { name: /Tersedia/ })).toHaveAttribute(
      "href",
      `/reservasi?startTime=${availableSlots[0].startTime}`,
    )
  })

  it("tidak menautkan slot terblokir meski slotHref diberikan", () => {
    const slots = withBlockedSlot("08:00", "APPROVED")
    render(<AvailabilityGrid slots={slots} slotHref={() => "/reservasi"} />)

    expect(screen.getByText("08:00").closest("a")).toBeNull()
    expect(screen.getByText("08:00").closest('[aria-disabled="true"]')).not.toBeNull()
  })
})

describe("AvailabilityGrid mode pilih", () => {
  it("memanggil onSelectSlot saat kotak tersedia diklik", async () => {
    const user = userEvent.setup()
    const onSelectSlot = vi.fn()
    render(
      <AvailabilityGrid
        slots={availableSlots}
        selection={{ selectedStart: null, selectedEnd: null, onSelectSlot }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /^08:00/ }))

    expect(onSelectSlot).toHaveBeenCalledTimes(1)
    expect(onSelectSlot.mock.calls[0]?.[0]).toMatchObject({ startTime: "08:00" })
  })

  it("menonaktifkan kotak yang tidak tersedia dan kotak jendela H-14", () => {
    const slots = withBlockedSlot("08:00", "APPROVED")
    render(
      <AvailabilityGrid
        slots={slots}
        selection={{
          selectedStart: null,
          selectedEnd: null,
          disabledStarts: new Set(["09:00"]),
          onSelectSlot: vi.fn(),
        }}
      />,
    )

    expect(screen.getByRole("button", { name: /^08:00/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^09:00/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^10:00/ })).toBeEnabled()
  })

  it("menandai kotak jam mulai dan jam selesai yang terpilih", () => {
    render(
      <AvailabilityGrid
        slots={availableSlots}
        selection={{ selectedStart: "08:00", selectedEnd: "09:00", onSelectSlot: vi.fn() }}
      />,
    )

    expect(screen.getByRole("button", { name: /^08:00/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /^09:00/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /^10:00/ })).toHaveAttribute("aria-pressed", "false")
  })
})
