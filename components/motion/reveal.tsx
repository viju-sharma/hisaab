"use client"

import { motion, useReducedMotion } from "motion/react"

/// Motion here is confirmation, not decoration. Things arrive from where they
/// belong and settle quickly: the travel is a few pixels and the curve decays
/// hard, because an app about money should read as steady. Anything that
/// swoops or bounces would undercut the ledger.
const DISTANCE = 14
const DURATION = 0.5

/// A decelerating curve — fast to start, long tail. Matches `--ease-spring` in
/// globals.css closely enough that CSS transitions and these animations do not
/// look like two different systems.
const EASE = [0.16, 1, 0.3, 1] as const

type RevealProps = {
  children: React.ReactNode
  className?: string
  /// Seconds. Use sparingly — a delay on something the reader is waiting for
  /// is just latency you added on purpose.
  delay?: number
}

/// Fades a block in as it enters the viewport, once. Below the fold this reads
/// as the page composing itself; above it, as the page arriving.
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: DISTANCE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}
