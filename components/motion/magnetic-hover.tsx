"use client"

import { motion, useMotionValue, useSpring } from "motion/react"

import { useMotionPreference } from "@/components/motion/use-motion-preference"
import type { MotionDistanceToken } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface MagneticOffsetInput {
  clientX: number
  clientY: number
  rect: { left: number; top: number; width: number; height: number }
  strength: number
  radius: number
  reduceMotion: boolean
}

/**
 * Seam murni untuk diuji tanpa DOM.
 *
 * Nilai selalu dibatasi pada ±strength, dan nol saat reduced motion sehingga
 * node tidak pernah menerima transform.
 */
export function getMagneticOffset({
  clientX,
  clientY,
  rect,
  strength,
  radius,
  reduceMotion,
}: MagneticOffsetInput) {
  if (reduceMotion || strength === 0 || radius === 0) return { x: 0, y: 0 }

  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)

  if (Math.hypot(dx, dy) > radius) return { x: 0, y: 0 }

  const halfWidth = rect.width / 2 || 1
  const halfHeight = rect.height / 2 || 1
  const ratioX = Math.max(-1, Math.min(1, dx / halfWidth))
  const ratioY = Math.max(-1, Math.min(1, dy / halfHeight))

  return { x: ratioX * strength, y: ratioY * strength }
}

interface MagneticHoverProps {
  children: React.ReactNode
  strength?: MotionDistanceToken
  radius?: MotionDistanceToken
  className?: string
}

/**
 * Efek magnetik mengikuti pointer. Tidak memakai penanda kontrak karena tidak
 * pernah bertransformasi saat diam: reset dipicu oleh pointer leave dan blur,
 * sehingga perilaku keyboard tidak terpengaruh.
 */
export function MagneticHover({
  children,
  strength = "sm",
  radius = "lg",
  className,
}: MagneticHoverProps) {
  const motionPreference = useMotionPreference()
  const maxStrength = motionPreference.distance(strength)
  const maxRadius = motionPreference.distance(radius)
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const x = useSpring(targetX, motionPreference.spring("gentle"))
  const y = useSpring(targetY, motionPreference.spring("gentle"))

  function reset() {
    targetX.set(0)
    targetY.set(0)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const next = getMagneticOffset({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      strength: maxStrength,
      radius: maxRadius,
      reduceMotion: motionPreference.reduceMotion,
    })

    targetX.set(next.x)
    targetY.set(next.y)
  }

  return (
    <motion.div
      className={cn("min-w-0", className)}
      style={motionPreference.reduceMotion ? undefined : { x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </motion.div>
  )
}
