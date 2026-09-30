import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { CookieConsentBanner } from "@/components/site/cookie-consent-banner"

const KEY = "ruvana-cookie-consent-v1"

beforeEach(() => localStorage.removeItem(KEY))
afterEach(() => {
  cleanup()
  localStorage.removeItem(KEY)
})

describe("CookieConsentBanner", () => {
  it("menanyakan pilihan kepada pengunjung dan menyimpan persetujuan", async () => {
    const user = userEvent.setup()
    render(<CookieConsentBanner />)

    expect(await screen.findByRole("region", { name: "Persetujuan cookie" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Setuju" }))

    expect(localStorage.getItem(KEY)).toBe("accepted")
    expect(screen.queryByRole("region", { name: "Persetujuan cookie" })).not.toBeInTheDocument()
  })

  it("menyimpan pilihan cookie wajib saja", async () => {
    const user = userEvent.setup()
    render(<CookieConsentBanner />)
    await screen.findByRole("region", { name: "Persetujuan cookie" })
    await user.click(screen.getByRole("button", { name: "Hanya yang wajib" }))

    expect(localStorage.getItem(KEY)).toBe("essential-only")
  })
})
