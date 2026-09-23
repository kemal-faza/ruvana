import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  getMotionTransition,
  motionCss,
  motionDistances,
  motionDurations,
  motionEasings,
  motionStagger,
  motionTokens,
} from "@/lib/motion"

function readCss() {
  const cssUrl = new URL("../app/globals.css", import.meta.url)
  return readFileSync(
    cssUrl.protocol === "file:"
      ? cssUrl
      : new URL(`file://${process.cwd()}/app/globals.css`),
    "utf8",
  )
}

describe("motion tokens", () => {
  it("menghormati preferensi reduced motion", () => {
    expect(getMotionTransition(null)).toEqual({
      duration: 0.18,
      ease: [0.22, 1, 0.36, 1],
    })
    expect(getMotionTransition(true)).toEqual({ duration: 0 })
    expect(getMotionTransition(false)).toEqual({
      duration: 0.18,
      ease: [0.22, 1, 0.36, 1],
    })
  })

  it("menjaga token Motion sinkron dengan CSS", () => {
    const cssUrl = new URL("../app/globals.css", import.meta.url)
    const css = readFileSync(
      cssUrl.protocol === "file:"
        ? cssUrl
        : new URL(`file://${process.cwd()}/app/globals.css`),
      "utf8",
    )

    expect(css).toContain(`--motion-duration-standard: ${motionTokens.cssDuration};`)
    expect(css).toContain(`--motion-easing-standard: ${motionTokens.cssEasing};`)
  })

  it("menjaga tabel token angka tetap sinkron dengan nilai CSS-nya", () => {
    for (const [name, seconds] of Object.entries(motionDurations)) {
      expect(motionCss.durations[name as keyof typeof motionDurations]).toBe(
        `${Math.round(seconds * 1000)}ms`,
      )
    }

    for (const [name, ease] of Object.entries(motionEasings)) {
      expect(motionCss.easings[name as keyof typeof motionEasings]).toBe(
        `cubic-bezier(${ease.join(", ")})`,
      )
    }

    for (const [name, px] of Object.entries(motionDistances)) {
      const rem = Number.parseFloat(motionCss.distances[name as keyof typeof motionDistances])
      expect(rem * 16).toBe(px)
    }

    for (const [name, seconds] of Object.entries(motionStagger)) {
      expect(motionCss.stagger[name as keyof typeof motionStagger]).toBe(
        `${Math.round(seconds * 1000)}ms`,
      )
    }
  })

  it("mencerminkan setiap token Motion sebagai custom property CSS", () => {
    const css = readCss()

    for (const [name, value] of Object.entries(motionCss.durations)) {
      expect(css).toContain(`--motion-duration-${name}: ${value};`)
    }

    for (const [name, value] of Object.entries(motionCss.easings)) {
      expect(css).toContain(`--motion-easing-${name}: ${value};`)
    }

    for (const [name, value] of Object.entries(motionCss.distances)) {
      expect(css).toContain(`--motion-distance-${name}: ${value};`)
    }

    for (const [name, value] of Object.entries(motionCss.stagger)) {
      expect(css).toContain(`--motion-stagger-${name}: ${value};`)
    }
  })
})
