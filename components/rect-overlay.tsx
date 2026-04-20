"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { Rect } from "@/compositions/types"

export type RectOverlayProps = {
  rect: Rect
  onChange: (rect: Rect) => void
  /** Desired output aspect (width/height) in pixels. If set, rect is constrained so that
   * rect.width * containerPxWidth / (rect.height * containerPxHeight) === aspectLock. */
  aspectLock?: number
  accent?: "primary" | "accent"
  label?: string
  disabled?: boolean
  className?: string
}

type Corner = "nw" | "ne" | "sw" | "se"
type Mode =
  | { kind: "move"; origin: { x: number; y: number }; start: Rect }
  | { kind: "resize"; corner: Corner; origin: { x: number; y: number }; start: Rect }
  | null

const MIN = 0.05

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function clampRect(r: Rect): Rect {
  const width = clamp(r.width, MIN, 1)
  const height = clamp(r.height, MIN, 1)
  return {
    width,
    height,
    x: clamp(r.x, 0, 1 - width),
    y: clamp(r.y, 0, 1 - height),
  }
}

export function RectOverlay({
  rect,
  onChange,
  aspectLock,
  accent = "primary",
  label,
  disabled,
  className,
}: RectOverlayProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState<Mode>(null)
  const modeRef = React.useRef(mode)
  modeRef.current = mode

  React.useEffect(() => {
    function getParentRect() {
      const parent = wrapperRef.current?.parentElement
      return parent?.getBoundingClientRect() ?? null
    }
    function containerAspect() {
      const pr = getParentRect()
      return pr ? pr.width / pr.height : 1
    }

    function onMove(e: PointerEvent) {
      const current = modeRef.current
      if (!current) return
      const parentRect = getParentRect()
      if (!parentRect) return
      const nx = (e.clientX - parentRect.left) / parentRect.width
      const ny = (e.clientY - parentRect.top) / parentRect.height
      const dx = nx - current.origin.x
      const dy = ny - current.origin.y
      const s = current.start

      if (current.kind === "move") {
        onChange(
          clampRect({ x: s.x + dx, y: s.y + dy, width: s.width, height: s.height })
        )
        return
      }

      const c = current.corner
      let width: number
      let height: number
      if (aspectLock) {
        const ratio = containerAspect() / aspectLock
        const signedDx = c === "nw" || c === "sw" ? -dx : dx
        width = clamp(s.width + signedDx, MIN, 1)
        height = clamp(width * ratio, MIN, 1)
        if (height === 1) width = height / ratio
      } else {
        const signedDx = c === "nw" || c === "sw" ? -dx : dx
        const signedDy = c === "nw" || c === "ne" ? -dy : dy
        width = clamp(s.width + signedDx, MIN, 1)
        height = clamp(s.height + signedDy, MIN, 1)
      }

      const x =
        c === "nw" || c === "sw"
          ? s.x + (s.width - width)
          : s.x
      const y =
        c === "nw" || c === "ne"
          ? s.y + (s.height - height)
          : s.y

      onChange(clampRect({ x, y, width, height }))
    }

    function onUp() {
      setMode(null)
    }

    if (mode) {
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      return () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
    }
  }, [mode, aspectLock, onChange])

  const start = (e: React.PointerEvent, make: (p: { x: number; y: number }) => Mode) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    const parent = wrapperRef.current?.parentElement
    if (!parent) return
    const pr = parent.getBoundingClientRect()
    const p = {
      x: (e.clientX - pr.left) / pr.width,
      y: (e.clientY - pr.top) / pr.height,
    }
    setMode(make(p))
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "pointer-events-none absolute",
        disabled && "opacity-60",
        className
      )}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
    >
      <div
        onPointerDown={(e) =>
          start(e, (origin) => ({ kind: "move", origin, start: rect }))
        }
        className={cn(
          "pointer-events-auto absolute inset-0 cursor-grab border-2 active:cursor-grabbing",
          accent === "primary" &&
            "border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]",
          accent === "accent" && "border-white ring-1 ring-black/40"
        )}
      >
        {label && (
          <div
            className={cn(
              "absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
              accent === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-black"
            )}
          >
            {label}
          </div>
        )}
        {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => (
          <button
            key={corner}
            type="button"
            aria-label={`Resize ${corner}`}
            onPointerDown={(e) =>
              start(e, (origin) => ({
                kind: "resize",
                corner,
                origin,
                start: rect,
              }))
            }
            className={cn(
              "pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2",
              accent === "primary"
                ? "border-primary bg-background"
                : "border-white bg-black/80",
              corner === "nw" && "top-0 left-0 cursor-nw-resize",
              corner === "ne" && "top-0 left-full cursor-ne-resize",
              corner === "sw" && "top-full left-0 cursor-sw-resize",
              corner === "se" && "top-full left-full cursor-se-resize"
            )}
          />
        ))}
      </div>
    </div>
  )
}
