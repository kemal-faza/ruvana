import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/motion/use-motion-preference", () => ({
  useMotionPreference: () => ({
    reduceMotion: false,
    duration: () => 0.42,
    easing: () => [0.16, 1, 0.3, 1] as const,
    spring: () => ({ type: "spring" as const, stiffness: 320, damping: 26 }),
    distance: () => 28,
    transition: () => ({ duration: 0.42, ease: [0.16, 1, 0.3, 1] as const }),
  }),
}))

import { getMagneticOffset, MagneticHover } from "@/components/motion/magnetic-hover"

const rect = { left: 0, top: 0, width: 200, height: 100 }

afterEach(cleanup)

describe("MagneticHover", () => {
  it("merender anaknya tanpa penanda kontrak motion", () => {
    render(
      <MagneticHover>
        <p>Kartu interaktif</p>
      </MagneticHover>,
    )

    const node = screen.getByText("Kartu interaktif").closest("[data-motion-ambient]")
    expect(node).toBeNull()
    expect(screen.getByText("Kartu interaktif")).toBeInTheDocument()
  })
})

describe("getMagneticOffset", () => {
  it("diam saat pointer berada di tengah", () => {
    expect(
      getMagneticOffset({
        clientX: 100,
        clientY: 50,
        rect,
        strength: 16,
        radius: 48,
        reduceMotion: false,
      }),
    ).toEqual({ x: 0, y: 0 })
  })

  it("diam saat pointer di luar radius", () => {
    expect(
      getMagneticOffset({
        clientX: 400,
        clientY: 300,
        rect,
        strength: 16,
        radius: 48,
        reduceMotion: false,
      }),
    ).toEqual({ x: 0, y: 0 })
  })

  it("diam total saat reduced motion", () => {
    expect(
      getMagneticOffset({
        clientX: 120,
        clientY: 20,
        rect,
        strength: 16,
        radius: 48,
        reduceMotion: true,
      }),
    ).toEqual({ x: 0, y: 0 })
  })

  it("membatasi perpindahan pada nilai strength", () => {
    const offset = getMagneticOffset({
      clientX: 220,
      clientY: 110,
      rect,
      strength: 16,
      radius: 200,
      reduceMotion: false,
    })

    expect(offset.x).toBeLessThanOrEqual(16)
    expect(offset.y).toBeLessThanOrEqual(16)
    expect(offset.x).toBeGreaterThan(0)
    expect(offset.y).toBeGreaterThan(0)
  })
})
