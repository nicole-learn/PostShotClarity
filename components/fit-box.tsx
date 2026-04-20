"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fits a box of given aspect ratio inside its parent so it never overflows
 * in either dimension. Children see a stable, correctly-sized stage for
 * overlays (rect-overlay, etc.) to measure against.
 */
export function FitBox({
  aspect,
  className,
  children,
}: {
  aspect: number
  className?: string
  children: React.ReactNode
}) {
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)

  React.useLayoutEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const parentAspect = width / height
      if (parentAspect > aspect) {
        setSize({ w: height * aspect, h: height })
      } else {
        setSize({ w: width, h: width / aspect })
      }
    }
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [aspect])

  return (
    <div ref={parentRef} className={cn("relative h-full w-full", className)}>
      {size && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: size.w, height: size.h }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
