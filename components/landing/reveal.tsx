"use client"

import { motion, useReducedMotion } from "motion/react"

import { getRevealProps } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      data-motion-transform="true"
      className={cn("min-w-0 motion-reduce:!transform-none", className)}
      {...getRevealProps(reduceMotion, delay)}
    >
      {children}
    </motion.div>
  )
}
