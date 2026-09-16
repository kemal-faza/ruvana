import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  contrastRatio,
  readCssToken,
  resolveCssToken,
} from "@/components/ui/contrast-test-utils"

describe("kontras hover aksi utama", () => {
  it("memakai token hover semantic pada Button utama", () => {
    const classes = buttonVariants({ variant: "primary" })

    expect(classes).toContain("hover:bg-primary-hover")
    expect(classes).not.toContain("hover:bg-primary/80")
  })

  it("memakai token hover semantic pada Badge utama yang dapat diklik", () => {
    const classes = badgeVariants({ variant: "default" })

    expect(classes).toContain("[a]:hover:bg-primary-hover")
    expect(classes).not.toContain("[a]:hover:bg-primary/80")
  })

  it("memenuhi WCAG AA untuk pasangan token hover light dan dark", () => {
    const css = readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf8")
    const firstRoot = css.indexOf(":root")
    const secondRoot = css.indexOf(":root", firstRoot + 1)
    const primitiveTokens = css.slice(firstRoot, secondRoot)
    const lightTokens = css.slice(secondRoot, css.indexOf(".dark", secondRoot))
    const darkTokens = css.slice(
      css.indexOf(".dark", secondRoot),
      css.indexOf("@layer base"),
    )

    const lightRatio = contrastRatio(
      resolveCssToken(readCssToken(lightTokens, "primary-hover-foreground"), primitiveTokens),
      resolveCssToken(readCssToken(lightTokens, "primary-hover"), primitiveTokens),
    )
    const darkRatio = contrastRatio(
      resolveCssToken(readCssToken(darkTokens, "primary-hover-foreground"), primitiveTokens),
      resolveCssToken(readCssToken(darkTokens, "primary-hover"), primitiveTokens),
    )

    expect(lightRatio).toBeGreaterThanOrEqual(4.5)
    expect(darkRatio).toBeGreaterThanOrEqual(4.5)
  })
})
