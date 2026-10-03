import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/LoginForm", () => ({
  default: ({ next }: { next?: string }) => <div data-testid="login-next">{next}</div>,
}))

import LoginPage from "@/app/login/page"

describe("LoginPage", () => {
  it("meneruskan tujuan lokal dari query next ke formulir login", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({ next: "/reservasi?type=aula&date=2026-10-04" }),
    })

    expect(page.props.next).toBe("/reservasi?type=aula&date=2026-10-04")
  })

  it("mengabaikan next yang berulang", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ next: ["/reservasi", "/reports"] }) })

    expect(page.props.next).toBeUndefined()
  })
})
