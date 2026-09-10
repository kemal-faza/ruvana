import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

describe("kontras hover aksi utama", () => {
  it("memakai token hover semantic pada Button utama", () => {
    const classes = buttonVariants({ variant: "default" })

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
    const darkTokens = css.slice(css.indexOf(".dark"), css.indexOf("@layer base"))

    const readToken = (block: string, name: string) => {
      const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
      if (!match) throw new Error(`Token CSS tidak ditemukan: --${name}`)
      return match[1].trim()
    }
    const resolveToken = (value: string) => {
      const alias = value.match(/^var\((--[^)]+)\)$/)?.[1]
      return alias ? readToken(primitiveTokens, alias.slice(2)) : value
    }
    const parseOklch = (value: string) => {
      const match = value.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/)
      if (!match) throw new Error(`Nilai token bukan OKLCH: ${value}`)
      const lightness = Number(match[1]) / 100
      const chroma = Number(match[2])
      const hue = (Number(match[3]) * Math.PI) / 180
      const a = chroma * Math.cos(hue)
      const b = chroma * Math.sin(hue)
      const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
      const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
      const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
      const toSrgb = (channel: number) => {
        const linear =
          channel <= 0.0031308
            ? 12.92 * channel
            : 1.055 * channel ** (1 / 2.4) - 0.055
        return Math.max(0, Math.min(1, linear))
      }
      return [
        toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      ]
    }
    const luminance = (rgb: number[]) =>
      rgb.reduce(
        (total, channel, index) =>
          total +
          (channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index],
        0,
      )
    const contrastRatio = (foreground: string, background: string) => {
      const foregroundLuminance = luminance(parseOklch(foreground))
      const backgroundLuminance = luminance(parseOklch(background))
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      )
    }

    const lightRatio = contrastRatio(
      resolveToken(readToken(lightTokens, "primary-hover-foreground")),
      resolveToken(readToken(lightTokens, "primary-hover")),
    )
    const darkRatio = contrastRatio(
      resolveToken(readToken(darkTokens, "primary-hover-foreground")),
      resolveToken(readToken(darkTokens, "primary-hover")),
    )

    expect(lightRatio).toBeGreaterThanOrEqual(4.5)
    expect(darkRatio).toBeGreaterThanOrEqual(4.5)
  })
})
