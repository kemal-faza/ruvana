import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { axe } from "vitest-axe"

import { LABEL_STATUS_RESERVASI } from "@/config/labels"
import type { StatusReservasi } from "@/generated/prisma/enums"
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge"

const SEMUA_STATUS: StatusReservasi[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_OFFICER",
  "CANCELLED_BY_MAINTENANCE",
  "EXPIRED",
]

afterEach(cleanup)

describe("ReservationStatusBadge", () => {
  it.each(SEMUA_STATUS)("merender label domain Indonesia untuk %s", (status) => {
    render(<ReservationStatusBadge status={status} />)

    expect(screen.getByText(LABEL_STATUS_RESERVASI[status])).toBeInTheDocument()
  })

  it("tidak merender string enum mentah untuk seluruh status", () => {
    const { container } = render(
      <div>
        {SEMUA_STATUS.map((status) => (
          <ReservationStatusBadge key={status} status={status} />
        ))}
      </div>,
    )

    const teks = container.textContent ?? ""
    for (const status of SEMUA_STATUS) {
      expect(teks).not.toContain(status)
    }
  })

  it("lolos pemeriksaan aksesibilitas", async () => {
    const { container } = render(
      <div>
        {SEMUA_STATUS.map((status) => (
          <ReservationStatusBadge key={status} status={status} />
        ))}
      </div>,
    )

    expect((await axe(container)).violations).toEqual([])
  })
})
