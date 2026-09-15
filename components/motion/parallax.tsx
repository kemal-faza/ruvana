"use client"

import { motion, useScroll, useTransform } from "motion/react"
import { useRef, useSyncExternalStore } from "react"

import { useMotionPreference } from "@/components/motion/use-motion-preference"
import type { MotionDistanceToken } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Seam murni untuk diuji tanpa DOM.
 *
 * Saat reduced motion rentangnya dipusatkan di nol, sehingga node tidak pernah
 * menerima transform dan tetap memenuhi kontrak penanda ambient.
 */
export function getParallaxRange(reduceMotion: boolean, speed: number, distance: number) {
  if (reduceMotion) return { from: 0, to: 0 }

  const offset = distance * speed

  return { from: offset, to: -offset }
}

interface ParallaxProps {
  children: React.ReactNode
  /** Rasio pergeseran terhadap jarak token. Nilai negatif membalik arah. */
  speed?: number
  axis?: "x" | "y"
  clamp?: boolean
  distance?: MotionDistanceToken
  className?: string
}

export function Parallax({
  children,
  speed = 0.5,
  axis = "y",
  clamp = true,
  distance = "lg",
  className,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const motionPreference = useMotionPreference()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  // Transform hanya dipasang setelah mount. Saat SSR, `useReducedMotion` belum
  // membaca preferensi sistem, sehingga nilai transform ikut ter-render ke HTML
  // dan tidak pernah dipatch ulang saat hidrasi (React melaporkan hydration
  // mismatch dan membiarkan inline style lama). `useSyncExternalStore` memberi
  // jawaban server `false` dan klien `true` tanpa cascading render, sehingga node
  // ambient tetap `transform: none` saat reduced motion.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const range = getParallaxRange(
    motionPreference.reduceMotion,
    speed,
    motionPreference.distance(distance),
  )
  const value = useTransform(scrollYProgress, [0, 1], [range.from, range.to], { clamp })

  const active = mounted && !motionPreference.reduceMotion

  return (
    <motion.div
      ref={ref}
      data-motion-ambient="true"
      className={cn("min-w-0", className)}
      style={active ? (axis === "y" ? { y: value } : { x: value }) : undefined}
    >
      {children}
    </motion.div>
  )
}
