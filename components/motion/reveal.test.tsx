import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const motionState = vi.hoisted(() => ({ reduceMotion: false, springTokens: [] as (string | undefined)[] }))

vi.mock("@/components/motion/use-motion-preference", () => ({
  useMotionPreference: () => ({
    reduceMotion: motionState.reduceMotion,
    duration: () => 0.42,
    easing: () => [0.16, 1, 0.3, 1] as const,
    spring: (token?: string) => {
      motionState.springTokens.push(token)
      return { type: "spring" as const, stiffness: 320, damping: 26 }
    },
    distance: (token?: string) =>
      motionState.reduceMotion ? 0 : token === "lg" ? 48 : 28,
    transition: () =>
      motionState.reduceMotion
        ? { duration: 0 }
        : { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  }),
}))

import { getRevealTargets, Reveal } from "@/components/motion/reveal"

afterEach(() => {
  cleanup()
  motionState.reduceMotion = false
  motionState.springTokens = []
})

describe("Reveal", () => {
  it("menandai node reveal dan merender anaknya", () => {
    render(
      <Reveal>
        <p>Isi hero</p>
      </Reveal>,
    )

    const node = screen.getByText("Isi hero").closest("[data-motion-reveal]")
    expect(node).not.toBeNull()
    expect(node).toHaveAttribute("data-motion-reveal", "true")
  })

  it("merender tag sesuai prop as", () => {
    render(
      <Reveal as="li">
        <span>Butir langkah</span>
      </Reveal>,
    )

    expect(screen.getByText("Butir langkah").closest("li")).not.toBeNull()
  })

  it("menggabungkan className pemanggil dengan kelas primitif", () => {
    render(
      <Reveal className="h-full">
        <p>Kartu manfaat</p>
      </Reveal>,
    )

    const node = screen.getByText("Kartu manfaat").closest("[data-motion-reveal]")
    expect(node?.className).toContain("h-full")
    expect(node?.className).toContain("min-w-0")
  })

  it("merutekan prop spring ke token spring, bukan ke durasi", () => {
    render(
      <Reveal spring="snappy">
        <p>Hero dengan spring</p>
      </Reveal>,
    )

    expect(motionState.springTokens).toEqual(["snappy"])
  })

  it("tidak memakai spring ketika prop spring tidak diisi", () => {
    render(
      <Reveal>
        <p>Hero tanpa spring</p>
      </Reveal>,
    )

    expect(motionState.springTokens).toEqual([])
  })
})

describe("getRevealTargets", () => {
  it("tidak menyembunyikan konten saat reduced motion", () => {
    expect(getRevealTargets(true, "up", 0)).toEqual({
      initial: { opacity: 1 },
      whileInView: { opacity: 1 },
    })
  })

  it("bergerak dari jarak token menuju keadaan diam", () => {
    expect(getRevealTargets(false, "up", 28)).toEqual({
      initial: { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
    })
    expect(getRevealTargets(false, "left", 28)).toEqual({
      initial: { opacity: 0, x: 28 },
      whileInView: { opacity: 1, x: 0 },
    })
  })

  it("kembali ke skala penuh untuk varian scale", () => {
    expect(getRevealTargets(false, "scale", 28)).toEqual({
      initial: { opacity: 0, scale: 0.96 },
      whileInView: { opacity: 1, scale: 1 },
    })
  })

  it("tidak menambah properti gerak untuk varian fade", () => {
    expect(getRevealTargets(false, "fade", 28)).toEqual({
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
    })
  })
})
