import { existsSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

describe("aset landing", () => {
  it("menyediakan foto hero yang dilacak git di public/", () => {
    const asset = path.resolve(process.cwd(), "public/ruvana-lab2.jpg")

    expect(existsSync(asset)).toBe(true)
    expect(statSync(asset).size).toBeGreaterThan(10_000)
  })
})
