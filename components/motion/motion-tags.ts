import { motion } from "motion/react"

// Tag yang boleh dipakai primitif motion. Dipetakan ke motion[tag] agar
// animasi tetap satu implementasi tanpa membuat komponen baru per tag.
export const motionTags = {
  div: motion.div,
  span: motion.span,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
} as const

export type MotionTag = keyof typeof motionTags
