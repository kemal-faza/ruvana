export const motionTokens = {
  durationSeconds: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
  cssDuration: "180ms",
  cssEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const

export const motionDurations = {
  micro: 0.12,
  standard: motionTokens.durationSeconds,
  expressive: 0.42,
  cinematic: 0.62,
} as const

export const motionEasings = {
  standard: motionTokens.ease,
  emphatic: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
} as const

export const motionSprings = {
  gentle: { stiffness: 120, damping: 18 },
  snappy: { stiffness: 320, damping: 26 },
  bouncy: { stiffness: 420, damping: 14 },
} as const

export const motionDistances = {
  xs: 8,
  sm: 16,
  md: 28,
  lg: 48,
} as const

export const motionStagger = {
  expressive: 0.09,
  functional: 0.04,
} as const

export const motionAmbient = {
  minSeconds: 6,
  maxSeconds: 12,
} as const

// Cermin CSS dari tabel di atas. Nilai di sini diuji terhadap tabel angka
// oleh lib/motion.test.ts, sehingga keduanya tidak bisa menyimpang.
export const motionCss = {
  durations: {
    micro: "120ms",
    standard: motionTokens.cssDuration,
    expressive: "420ms",
    cinematic: "620ms",
  },
  easings: {
    standard: motionTokens.cssEasing,
    emphatic: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
  distances: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.75rem",
    lg: "3rem",
  },
  stagger: {
    expressive: "90ms",
    functional: "40ms",
  },
} as const

export type MotionDurationToken = keyof typeof motionDurations
export type MotionEasingToken = keyof typeof motionEasings
export type MotionSpringToken = keyof typeof motionSprings
export type MotionDistanceToken = keyof typeof motionDistances
export type MotionStaggerToken = keyof typeof motionStagger

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
