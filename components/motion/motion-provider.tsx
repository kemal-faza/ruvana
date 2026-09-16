"use client"

import { MotionConfig } from "motion/react"

/**
 * Gerbang motion di tingkat root. `reducedMotion="user"` mengikuti preferensi
 * sistem pengguna untuk posisi dan layout; hook `useMotionPreference` menutup
 * sisa celah pada animasi opacity.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
