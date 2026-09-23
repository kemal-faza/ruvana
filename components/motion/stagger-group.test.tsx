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
    transition: () =>
      motionState.reduceMotion
        ? { duration: 0 }
        : { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  }),
}))

import {
  getStaggerGroupVariants,
  getStaggerItemVariants,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion/stagger-group"

afterEach(() => {
  cleanup()
  motionState.reduceMotion = false
})

describe("StaggerGroup dan StaggerItem", () => {
  it("merender anak berurutan dan menandai tiap butir sebagai reveal", () => {
    render(
      <StaggerGroup>
        <StaggerItem>
          <p>Butir satu</p>
        </StaggerItem>
        <StaggerItem as="li">
          <p>Butir dua</p>
        </StaggerItem>
      </StaggerGroup>,
    )

    expect(screen.getByText("Butir satu").closest("[data-motion-reveal]")).not.toBeNull()
    expect(screen.getByText("Butir dua").closest("li")).not.toBeNull()
  })

  it("merender tag orkestrator sesuai prop as", () => {
    render(
      <StaggerGroup as="ol">
        <StaggerItem as="li">
          <p>Butir terurut</p>
        </StaggerItem>
      </StaggerGroup>,
    )

    expect(screen.getByText("Butir terurut").closest("ol")).not.toBeNull()
  })
})

describe("getStaggerGroupVariants", () => {
  it("memakai jarak antar anak sesuai token saat motion aktif", () => {
    expect(getStaggerGroupVariants(false, 0.09, 0.05)).toEqual({
      hidden: {},
      visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
    })
  })

  it("meniadakan jarak antar anak saat reduced motion", () => {
    expect(getStaggerGroupVariants(true, 0.09, 0.05)).toEqual({
      hidden: {},
      visible: { transition: { staggerChildren: 0, delayChildren: 0.05 } },
    })
  })
})

describe("getStaggerItemVariants", () => {
  it("bergerak dari jarak ke keadaan diam saat motion aktif", () => {
    expect(getStaggerItemVariants(false, 28, { duration: 0.42 })).toEqual({
      hidden: { opacity: 0, y: 28 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.42 } },
    })
  })

  it("langsung terlihat saat reduced motion", () => {
    expect(getStaggerItemVariants(true, 0, { duration: 0 })).toEqual({
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    })
  })
})
