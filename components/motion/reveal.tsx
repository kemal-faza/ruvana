"use client"

import { motionTags, type MotionTag } from "@/components/motion/motion-tags"
import { useMotionPreference } from "@/components/motion/use-motion-preference"
import type {
  MotionDistanceToken,
  MotionDurationToken,
  MotionEasingToken,
  MotionSpringToken,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

export type RevealFrom = "up" | "down" | "left" | "right" | "scale" | "fade"

const revealOffsets: Record<RevealFrom, (distance: number) => Record<string, number>> = {
  up: (distance) => ({ y: distance }),
  down: (distance) => ({ y: -distance }),
  left: (distance) => ({ x: distance }),
  right: (distance) => ({ x: -distance }),
  scale: () => ({ scale: 0.96 }),
  fade: () => ({}),
}

function restValues(offset: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(offset).map(([key]) => [key, key === "scale" ? 1 : 0]),
  )
}

/**
 * Seam murni untuk diuji tanpa DOM.
 *
 * Saat reduced motion, node TIDAK boleh mulai dari `opacity: 0`: reveal di luar
 * viewport tidak akan pernah memicu whileInView, sehingga kontennya tak terbaca.
 */
export function getRevealTargets(
  reduceMotion: boolean,
  from: RevealFrom,
  distance: number,
) {
  if (reduceMotion) {
    return { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
  }

  const offset = revealOffsets[from](distance)

  return {
    initial: { opacity: 0, ...offset },
    whileInView: { opacity: 1, ...restValues(offset) },
  }
}

export const revealViewportOptions = { once: true, amount: 0.2 } as const

interface RevealProps {
  children: React.ReactNode
  as?: MotionTag
  from?: RevealFrom
  distance?: MotionDistanceToken
  duration?: MotionDurationToken
  /** Bila diisi, spring mengalahkan `duration`/`ease` untuk transisi posisi. */
  spring?: MotionSpringToken
  ease?: MotionEasingToken
  delay?: number
  className?: string
}

export function Reveal({
  children,
  as = "div",
  from = "up",
  distance = "md",
  duration = "expressive",
  spring,
  ease = "emphatic",
  delay = 0,
  className,
}: RevealProps) {
  const motionPreference = useMotionPreference()
  const targets = getRevealTargets(
    motionPreference.reduceMotion,
    from,
    motionPreference.distance(distance),
  )
  const Component = motionTags[as]
  const transition = spring
    ? motionPreference.spring(spring)
    : motionPreference.transition({ duration, ease, delay })

  return (
    <Component
      data-motion-reveal="true"
      className={cn("min-w-0 motion-reduce:!transform-none", className)}
      initial={targets.initial}
      whileInView={targets.whileInView}
      viewport={revealViewportOptions}
      transition={transition}
    >
      {children}
    </Component>
  )
}
