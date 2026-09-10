import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { getMotionTransition, motionTokens } from "@/lib/motion"

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
})
