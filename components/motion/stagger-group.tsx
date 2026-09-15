"use client"

import { motion } from "motion/react"

import { motionTags, type MotionTag } from "@/components/motion/motion-tags"
import { useMotionPreference } from "@/components/motion/use-motion-preference"
import { motionStagger, type MotionDistanceToken, type MotionStaggerToken } from "@/lib/motion"
import { cn } from "@/lib/utils"

export const staggerViewportOptions = { once: true, amount: 0.2 } as const

export function getStaggerGroupVariants(
  reduceMotion: boolean,
  stagger: number,
  delayChildren: number,
) {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : stagger,
        delayChildren,
      },
    },
  }
}

export function getStaggerItemVariants(
  reduceMotion: boolean,
  distance: number,
  transition: object,
) {
  if (reduceMotion) {
    return { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  }

  return {
    hidden: { opacity: 0, y: distance },
    visible: { opacity: 1, y: 0, transition },
  }
}

interface StaggerGroupProps {
  children: React.ReactNode
  stagger?: MotionStaggerToken
  delayChildren?: number
  className?: string
}

/**
 * Orkestrator. Tidak memakai penanda kontrak karena tidak menganimasikan
 * propertinya sendiri; penanda melekat pada tiap StaggerItem.
 */
export function StaggerGroup({
  children,
  stagger = "expressive",
  delayChildren = 0,
  className,
}: StaggerGroupProps) {
  const motionPreference = useMotionPreference()

  return (
    <motion.div
      className={cn("min-w-0", className)}
      initial="hidden"
      whileInView="visible"
      viewport={staggerViewportOptions}
      variants={getStaggerGroupVariants(
        motionPreference.reduceMotion,
        motionStagger[stagger],
        delayChildren,
      )}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  as?: MotionTag
  distance?: MotionDistanceToken
  className?: string
}

export function StaggerItem({
  children,
  as = "div",
  distance = "md",
  className,
}: StaggerItemProps) {
  const motionPreference = useMotionPreference()
  const Component = motionTags[as]

  return (
    <Component
      data-motion-reveal="true"
      className={cn("min-w-0 motion-reduce:!transform-none", className)}
      variants={getStaggerItemVariants(
        motionPreference.reduceMotion,
        motionPreference.distance(distance),
        motionPreference.transition(),
      )}
    >
      {children}
    </Component>
  )
}
