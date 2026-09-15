import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function readCss() {
  const cssUrl = new URL("./globals.css", import.meta.url)
  return readFileSync(
    cssUrl.protocol === "file:"
      ? cssUrl
      : new URL(`file://${process.cwd()}/app/globals.css`),
    "utf8",
  )
}

describe("lapisan CSS motion Plan C", () => {
  it("memetakan token durasi ke namespace utility Tailwind yang benar", () => {
    const css = readCss()

    expect(css).toContain("--transition-duration-motion-micro: var(--motion-duration-micro);")
    expect(css).toContain("--transition-duration-motion-standard: var(--motion-duration-standard);")
    expect(css).toContain("--transition-duration-motion-expressive: var(--motion-duration-expressive);")
    expect(css).toContain("--transition-duration-motion-cinematic: var(--motion-duration-cinematic);")
    expect(css).not.toContain("--duration-motion-expressive:")
  })

  it("menyediakan stagger hero murni CSS dari token stagger", () => {
    const css = readCss()

    expect(css).toContain(".motion-rise-expressive {")
    expect(css).toContain(".motion-rise-scale {")
    expect(css).toContain(".motion-fade-expressive {")
    expect(css).toContain(".motion-rise-stagger {")
    expect(css).toContain(
      "animation-delay: calc(var(--motion-stagger-step, var(--motion-stagger-expressive)) * var(--stagger-index, 0));",
    )
    expect(css).toContain(".motion-rise-stagger-functional {")
    expect(css).toContain("--motion-stagger-step: var(--motion-stagger-functional);")
  })

  it("menggerakkan skeleton dengan shimmer yang berakhir diam", () => {
    const css = readCss()

    expect(css).toContain("@keyframes skeleton-shimmer {")
    expect(css).toContain(".skeleton-shimmer {")
    expect(css).toContain("animation: skeleton-shimmer var(--motion-duration-expressive) linear infinite;")
  })

  it("memakai token cinematic untuk transisi pergantian tema", () => {
    const css = readCss()

    expect(css).toContain(
      "animation: theme-slide-down var(--motion-duration-cinematic) var(--motion-easing-standard) both;",
    )
    expect(css).not.toContain("theme-slide-down 550ms")
  })
})
