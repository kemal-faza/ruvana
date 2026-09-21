import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const motionState = vi.hoisted(() => ({ reduceMotion: false as boolean | null }))

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionState.reduceMotion,
}))

import { useMotionPreference } from "@/components/motion/use-motion-preference"

describe("useMotionPreference", () => {
  it("memakai token tenang sebagai default saat motion aktif", () => {
    motionState.reduceMotion = false
    const { result } = renderHook(() => useMotionPreference())

    expect(result.current.reduceMotion).toBe(false)
    expect(result.current.duration()).toBe(0.18)
    expect(result.current.distance()).toBe(16)
    expect(result.current.easing()).toEqual([0.16, 1, 0.3, 1])
    expect(result.current.spring()).toEqual({ type: "spring", stiffness: 120, damping: 22 })
    expect(result.current.transition({ delay: 0.09 })).toEqual({
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.09,
    })
  })

  it("menerima nama token selain default", () => {
    motionState.reduceMotion = false
    const { result } = renderHook(() => useMotionPreference())

    expect(result.current.duration("micro")).toBe(0.12)
    expect(result.current.duration("standard")).toBe(0.18)
    expect(result.current.duration("cinematic")).toBe(0.62)
    expect(result.current.distance("lg")).toBe(48)
    expect(result.current.transition({ duration: "standard", ease: "exit" })).toEqual({
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    })
  })

  it("memperlakukan reduceMotion null sebagai motion aktif", () => {
    motionState.reduceMotion = null
    const { result } = renderHook(() => useMotionPreference())

    expect(result.current.reduceMotion).toBe(false)
    expect(result.current.duration()).toBe(0.18)
  })

  it("kolaps ke keadaan akhir instan saat reduce", () => {
    motionState.reduceMotion = true
    const { result } = renderHook(() => useMotionPreference())

    expect(result.current.reduceMotion).toBe(true)
    expect(result.current.duration()).toBe(0)
    expect(result.current.distance()).toBe(0)
    expect(result.current.spring()).toEqual({ duration: 0 })
    expect(result.current.transition({ duration: "cinematic", delay: 0.5 })).toEqual({ duration: 0 })
  })
})
