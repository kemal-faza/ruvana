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
  "EXPIRED",
]

// Kandungan token per status: setiap status memakai pasangan token semantik
// yang berbeda agar dapat dibedakan tanpa warna saja; label tetap disediakan.
const KELAS_VARIAN_RESERVASI: Record<StatusReservasi, string[]> = {
  PENDING: ["bg-warning-subdued", "text-warning-subdued-foreground"],
  APPROVED: ["bg-success-subdued", "text-success-subdued-foreground"],
  REJECTED: ["bg-destructive-subdued", "text-destructive-subdued-foreground"],
  CANCELLED_BY_USER: ["text-destructive"],
  CANCELLED_BY_OFFICER: ["bg-destructive", "text-destructive-foreground"],
  EXPIRED: ["bg-status-neutral-surface", "text-status-neutral-text"],
}

afterEach(cleanup)

describe("ReservationStatusBadge", () => {
  it.each(SEMUA_STATUS)("merender label domain Indonesia untuk %s", (status) => {
    render(<ReservationStatusBadge status={status} />)

    expect(screen.getByText(LABEL_STATUS_RESERVASI[status])).toBeInTheDocument()
  })

  it.each(SEMUA_STATUS)("memakai varian warna semantik yang tepat untuk %s", (status) => {
    const { container } = render(<ReservationStatusBadge status={status} />)

    const badge = container.querySelector('[data-slot="badge"]')
    for (const kelas of KELAS_VARIAN_RESERVASI[status]) {
      expect(badge).toHaveClass(kelas)
    }
    // Label teks tetap tampil sebagai cue nonwarna.
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
