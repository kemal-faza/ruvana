"use client"

import { useReducedMotion } from "motion/react"

import {
  motionDistances,
  motionDurations,
  motionEasings,
  motionSprings,
  type MotionDistanceToken,
  type MotionDurationToken,
  type MotionEasingToken,
  type MotionSpringToken,
} from "@/lib/motion"

export interface MotionTransitionOptions {
  duration?: MotionDurationToken
  ease?: MotionEasingToken
  delay?: number
}

export interface MotionPreference {
  reduceMotion: boolean
  duration: (token?: MotionDurationToken) => number
  easing: (token?: MotionEasingToken) => readonly [number, number, number, number]
  spring: (
    token?: MotionSpringToken,
  ) => { type: "spring"; stiffness: number; damping: number } | { duration: 0 }
  distance: (token?: MotionDistanceToken) => number
  transition: (options?: MotionTransitionOptions) => {
    duration: number
    ease?: readonly [number, number, number, number]
    delay?: number
  }
}

/**
 * Gerbang motion tunggal. `MotionConfig reducedMotion="user"` bawaan Motion
 * memaksa nilai posisi melompat ke target dan mematikan delay layout, tetapi
 * tidak mematikan animasi opacity, sehingga hook ini yang menutup celah itu.
 */
export function useMotionPreference(): MotionPreference {
  const reduceMotion = useReducedMotion() === true

  return {
    reduceMotion,
    duration: (token = "expressive") => (reduceMotion ? 0 : motionDurations[token]),
    easing: (token = "emphatic") => motionEasings[token],
    spring: (token = "gentle") =>
      reduceMotion ? { duration: 0 } : { type: "spring", ...motionSprings[token] },
    distance: (token = "md") => (reduceMotion ? 0 : motionDistances[token]),
    transition: (options = {}) => {
      if (reduceMotion) return { duration: 0 }

      const result: {
        duration: number
        ease?: readonly [number, number, number, number]
        delay?: number
      } = {
        duration: motionDurations[options.duration ?? "expressive"],
        ease: motionEasings[options.ease ?? "emphatic"],
      }

      if (options.delay !== undefined) result.delay = options.delay

      return result
    },
  }
}
