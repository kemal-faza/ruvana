import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  readCssToken,
  resolveCssToken,
} from "@/components/ui/contrast-test-utils"

function readPalette() {
  const css = readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf8")
  const firstRoot = css.indexOf(":root")
  const secondRoot = css.indexOf(":root", firstRoot + 1)
  const primitiveTokens = css.slice(firstRoot, secondRoot)
  const lightTokens = css.slice(secondRoot, css.indexOf(".dark", secondRoot))
  // `.dark` harus dicari mulai dari blok tema: `@custom-variant dark` di awal file
  // juga memuat teks ".dark", sehingga pencarian dari indeks 0 mengambil blok terang.
  const darkTokens = css.slice(css.indexOf(".dark", secondRoot), css.indexOf("@layer base"))

  return { css, primitiveTokens, lightTokens, darkTokens }
}

function token(block: string, primitiveTokens: string, name: string) {
  return resolveCssToken(readCssToken(block, name), primitiveTokens)
}

function ratio(block: string, primitiveTokens: string, foreground: string, background: string) {
  return contrastRatio(
    token(block, primitiveTokens, foreground),
    token(block, primitiveTokens, background),
  )
}

describe("palet token landing calm", () => {
  it("mendaftarkan aksen merek dan gold di kedua tema", () => {
    const { lightTokens, darkTokens } = readPalette()

    expect(readCssToken(lightTokens, "brand-olive")).toBe("#6F7F3B")
    expect(readCssToken(darkTokens, "brand-olive")).toBe("#AABB75")
    expect(readCssToken(lightTokens, "accent-gold")).toBe("#D9A441")
    expect(readCssToken(darkTokens, "accent-gold")).toBe("#E4B65A")
  })

  it("memetakan aksi utama ke color-action-strong dan fokus ke color-focus-ring", () => {
    const { lightTokens, darkTokens } = readPalette()

    expect(readCssToken(lightTokens, "primary")).toBe("#526222")
    expect(readCssToken(lightTokens, "primary-foreground")).toBe("#ffffff")
    expect(readCssToken(lightTokens, "ring")).toBe("#526222")
    expect(readCssToken(darkTokens, "primary")).toBe("#D2E297")
    expect(readCssToken(darkTokens, "primary-foreground")).toBe("#282C25")
    expect(readCssToken(darkTokens, "ring")).toBe("#AABB75")
  })

  it("memakai palet gelap desain untuk kanvas, permukaan, dan batas", () => {
    const { darkTokens } = readPalette()

    expect(readCssToken(darkTokens, "background")).toBe("#1A1E14")
    expect(readCssToken(darkTokens, "foreground")).toBe("#F7F5EF")
    expect(readCssToken(darkTokens, "card")).toBe("#282C25")
    expect(readCssToken(darkTokens, "muted")).toBe("#32372D")
    expect(readCssToken(darkTokens, "muted-foreground")).toBe("#C4C5BC")
    expect(readCssToken(darkTokens, "border")).toBe("#454A3E")
    expect(readCssToken(darkTokens, "secondary-foreground")).toBe("#F7F5EF")
    expect(readCssToken(darkTokens, "accent-foreground")).toBe("#F7F5EF")
  })

  it("memenuhi WCAG AA untuk setiap pasangan teks pada permukaan kontrol", () => {
    const { primitiveTokens, lightTokens, darkTokens } = readPalette()

    const pairs = [
      ["primary-foreground", "primary"],
      ["primary-hover-foreground", "primary-hover"],
      ["primary-subdued-foreground", "primary-subdued"],
      ["secondary-foreground", "secondary"],
      ["success-subdued-foreground", "success-subdued"],
      ["warning-subdued-foreground", "warning-subdued"],
      ["sidebar-primary-foreground", "sidebar-primary"],
    ] as const

    for (const [foreground, background] of pairs) {
      expect(ratio(lightTokens, primitiveTokens, foreground, background)).toBeGreaterThanOrEqual(4.5)
      expect(ratio(darkTokens, primitiveTokens, foreground, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("memberi indikator fokus kontras minimal 3:1 di kedua tema", () => {
    const { primitiveTokens, lightTokens, darkTokens } = readPalette()

    expect(ratio(lightTokens, primitiveTokens, "ring", "background")).toBeGreaterThanOrEqual(3)
    expect(ratio(darkTokens, primitiveTokens, "ring", "background")).toBeGreaterThanOrEqual(3)
  })

  it("menjadikan elevasi dapat berbeda per tema", () => {
    const { lightTokens, darkTokens } = readPalette()

    expect(readCssToken(lightTokens, "elevation-subtle")).toBe("0 2px 8px rgb(0 0 0 / 0.04)")
    expect(readCssToken(darkTokens, "elevation-subtle")).toBe("0 2px 10px rgb(0 0 0 / 0.18)")
  })

  it("memakai radius kartu 22 px", () => {
    const { css } = readPalette()

    expect(css).toContain("--radius-card: 1.375rem;")
  })

  it("menyingkirkan sisa nilai palet lama dari blok tema", () => {
    const { lightTokens, darkTokens } = readPalette()

    for (const legacy of ["#576721", "#181715", "#9eb06c", "#0b1300", "#bbcc8f"]) {
      expect(lightTokens).not.toContain(legacy)
      expect(darkTokens).not.toContain(legacy)
    }
  })
})
