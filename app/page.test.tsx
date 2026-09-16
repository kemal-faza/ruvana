import { describe, expect, it, vi } from "vitest"
import { redirect } from "next/navigation"

import Home from "@/app/page"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

describe("halaman utama", () => {
  it("mengalihkan ke halaman login", () => {
    Home()

    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
