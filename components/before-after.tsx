"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Props = {
  className?: string
  before: React.ReactNode
  after: React.ReactNode
  auto?: boolean
}

export function BeforeAfter({ className, before, after, auto = true }: Props) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const clipRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const handleRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let pos = 50
    let dir = 1
    let raf = 0
    let running = false
    let dragging = false
    let hovered = false

    const apply = (p: number) => {
      if (clipRef.current) clipRef.current.style.width = `${p}%`
      if (innerRef.current)
        innerRef.current.style.width = `${10000 / Math.max(0.01, p)}%`
      if (handleRef.current) handleRef.current.style.left = `${p}%`
    }

    const tick = () => {
      if (dragging || hovered) {
        running = false
        return
      }
      pos += dir * 0.25
      if (pos > 68) {
        pos = 68
        dir = -1
      }
      if (pos < 32) {
        pos = 32
        dir = 1
      }
      apply(pos)
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (running || !auto) return
      running = true
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const updateFromClient = (clientX: number) => {
      const r = el.getBoundingClientRect()
      const p = ((clientX - r.left) / r.width) * 100
      pos = Math.max(0, Math.min(100, p))
      apply(pos)
    }

    const onDown = (e: PointerEvent) => {
      dragging = true
      stop()
      updateFromClient(e.clientX)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      updateFromClient(e.clientX)
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      if (!hovered) start()
    }
    const onEnter = () => {
      hovered = true
      stop()
    }
    const onLeave = () => {
      hovered = false
      if (!dragging) start()
    }

    apply(pos)
    start()

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointerenter", onEnter)
    el.addEventListener("pointerleave", onLeave)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)

    return () => {
      stop()
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointerenter", onEnter)
      el.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [auto])

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative touch-none select-none overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0">{before}</div>
      <div
        ref={clipRef}
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: "50%" }}
      >
        <div
          ref={innerRef}
          className="absolute inset-0"
          style={{ width: "200%" }}
        >
          {after}
        </div>
      </div>
      <div
        ref={handleRef}
        className="absolute top-0 bottom-0 w-px bg-background/80 shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground)_15%,transparent)]"
        style={{ left: "50%" }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-e2">
          <span className="text-[10px] text-foreground/70">⇔</span>
        </span>
      </div>
    </div>
  )
}
