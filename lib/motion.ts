export const motionTokens = {
  durationSeconds: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
  cssDuration: "180ms",
  cssEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const

export function getMotionTransition(reduceMotion: boolean | null) {
  if (reduceMotion === true) {
    return { duration: 0 }
  }

  return {
    duration: motionTokens.durationSeconds,
    ease: motionTokens.ease,
  }
}
