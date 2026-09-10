import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  parseOklch,
} from "@/components/ui/contrast-test-utils"

describe("utilitas kontras warna", () => {
  it("mengubah OKLCH putih dan hitam menjadi sRGB yang dikenal", () => {
    parseOklch("oklch(100% 0 0)").forEach((channel) => {
      expect(channel).toBeCloseTo(1, 12)
    })
    expect(parseOklch("oklch(0% 0 0)")).toEqual([0, 0, 0])
  })

  it("menghitung rasio kontras hitam-putih sebagai 21:1", () => {
    expect(contrastRatio("oklch(100% 0 0)", "oklch(0% 0 0)")).toBeCloseTo(21, 5)
  })
})
