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

export const revealViewport = { once: true, amount: 0.2 } as const

function withDelay(reduceMotion: boolean | null, delay: number) {
  const transition = getMotionTransition(reduceMotion)
  return reduceMotion === true ? transition : { ...transition, delay }
}

export function getRevealProps(reduceMotion: boolean | null, delay = 0) {
  if (reduceMotion === true) {
    return {
      initial: { opacity: 1 },
      whileInView: { opacity: 1 },
      viewport: revealViewport,
      transition: withDelay(reduceMotion, delay),
    }
  }

  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: revealViewport,
    transition: withDelay(reduceMotion, delay),
  }
}
