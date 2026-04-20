"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Props = {
  value: number
  duration?: number
  decimals?: number
  className?: string
  format?: (n: number) => string
}

export function AnimatedNumber({
  value,
  duration = 400,
  decimals = 0,
  className,
  format,
}: Props) {
  const [display, setDisplay] = React.useState(value)
  const startRef = React.useRef(value)
  const fromRef = React.useRef(value)

  React.useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = from + (to - from) * eased
      setDisplay(cur)
      if (p < 1) raf = requestAnimationFrame(step)
      else {
        fromRef.current = to
        startRef.current = to
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const text = format
    ? format(display)
    : display.toFixed(decimals)

  return <span className={cn("tnum", className)}>{text}</span>
}
