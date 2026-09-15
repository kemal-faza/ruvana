import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const motionState = vi.hoisted(() => ({ reduceMotion: false }))

vi.mock("@/components/motion/use-motion-preference", () => ({
  useMotionPreference: () => ({
    reduceMotion: motionState.reduceMotion,
    duration: () => 0.42,
    easing: () => [0.16, 1, 0.3, 1] as const,
    spring: () => ({ type: "spring" as const, stiffness: 320, damping: 26 }),
    distance: (token?: string) => (motionState.reduceMotion ? 0 : token === "lg" ? 48 : 28),
    transition: () => ({ duration: 0.42, ease: [0.16, 1, 0.3, 1] as const }),
  }),
}))

import { getParallaxRange, Parallax } from "@/components/motion/parallax"

afterEach(() => {
  cleanup()
  motionState.reduceMotion = false
})

describe("Parallax", () => {
  it("menandai node sebagai motion berkelanjutan dan merender anaknya", () => {
    render(
      <Parallax>
        <p>Ilustrasi hero</p>
      </Parallax>,
    )

    const node = screen.getByText("Ilustrasi hero").closest("[data-motion-ambient]")
    expect(node).not.toBeNull()
    expect(node).toHaveAttribute("data-motion-ambient", "true")
  })
})

describe("getParallaxRange", () => {
  it("menghasilkan rentang simetris saat motion aktif", () => {
    expect(getParallaxRange(false, 0.5, 48)).toEqual({ from: 24, to: -24 })
  })

  it("memusatkan rentang di nol saat reduced motion", () => {
    expect(getParallaxRange(true, 0.5, 0)).toEqual({ from: 0, to: 0 })
  })
})

describe("lingkungan test", () => {
  it("menyediakan ResizeObserver", () => {
    expect(typeof ResizeObserver).not.toBe("undefined")
  })
})
