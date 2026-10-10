import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ push: vi.fn(), pathname: "/fasilitas/8" }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  usePathname: () => mocks.pathname,
}))

import { AvailabilityDateForm } from "./availability-date-form"

afterEach(() => {
  cleanup()
  mocks.push.mockClear()
})

describe("AvailabilityDateForm", () => {
  it("menampilkan ketersediaan lewat navigasi lunak tanpa muat ulang penuh", () => {
    const { container } = render(
      <AvailabilityDateForm facilityId={8} date="2026-09-27" today="2026-09-27" />,
    )

    fireEvent.submit(container.querySelector("form") as HTMLFormElement)

    expect(mocks.push).toHaveBeenCalledWith("/fasilitas/8?date=2026-09-27", { scroll: false })
  })

  it("menyediakan tautan Hari ini ke tanggal server saat tanggal berbeda", () => {
    render(<AvailabilityDateForm facilityId={8} date="2026-09-20" today="2026-09-27" />)

    expect(screen.getByRole("button", { name: /hari ini/i })).toHaveAttribute(
      "href",
      "/fasilitas/8?date=2026-09-27",
    )
  })

  it("menyembunyikan tautan Hari ini saat sudah di tanggal hari ini", () => {
    render(<AvailabilityDateForm facilityId={8} date="2026-09-27" today="2026-09-27" />)

    expect(screen.queryByRole("button", { name: /hari ini/i })).not.toBeInTheDocument()
  })
})
