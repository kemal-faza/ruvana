import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  readCssToken,
  resolveCssToken,
} from "@/components/ui/contrast-test-utils"

// Pasangan teks tombol varian lembut harus memenuhi WCAG AA (4,5:1) di
// kedua tema, sama seperti pasangan solid pada app/palette.test.ts.
function readThemes() {
  const css = readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf8")
  const firstRoot = css.indexOf(":root")
  const secondRoot = css.indexOf(":root", firstRoot + 1)
  const primitiveTokens = css.slice(firstRoot, secondRoot)
  const lightTokens = css.slice(secondRoot, css.indexOf(".dark", secondRoot))
  const darkTokens = css.slice(css.indexOf(".dark", secondRoot), css.indexOf("@layer base"))
  return { primitiveTokens, lightTokens, darkTokens }
}

describe("kontras tombol varian lembut", () => {
  it("memenuhi WCAG AA untuk pasangan soft dan danger-soft", () => {
    const { primitiveTokens, lightTokens, darkTokens } = readThemes()

    const pairs = [
      ["primary-subdued-foreground", "primary-subdued"],
      ["destructive-subdued-foreground", "destructive-subdued"],
    ] as const

    for (const [foreground, background] of pairs) {
      for (const block of [lightTokens, darkTokens]) {
        const rasio = contrastRatio(
          resolveCssToken(readCssToken(block, foreground), primitiveTokens),
          resolveCssToken(readCssToken(block, background), primitiveTokens),
        )
        expect(rasio).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
