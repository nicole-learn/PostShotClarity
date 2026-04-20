"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TrimSliderProps = {
  duration: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
  maxSpan?: number
  minSpan?: number
  className?: string
}

export function TrimSlider({
  duration,
  start,
  end,
  onChange,
  maxSpan,
  minSpan = 0.1,
  className,
}: TrimSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState<"start" | "end" | null>(null)

  React.useEffect(() => {
    if (!dragging) return
    function move(e: PointerEvent) {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const value = ratio * duration
      if (dragging === "start") {
        let next = Math.min(value, end - minSpan)
        if (maxSpan && end - next > maxSpan) next = end - maxSpan
        onChange(Math.max(0, next), end)
      } else {
        let next = Math.max(value, start + minSpan)
        if (maxSpan && next - start > maxSpan) next = start + maxSpan
        onChange(start, Math.min(duration, next))
      }
    }
    function up() {
      setDragging(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [dragging, duration, end, maxSpan, minSpan, onChange, start])

  const startPct = duration > 0 ? (start / duration) * 100 : 0
  const endPct = duration > 0 ? (end / duration) * 100 : 100

  return (
    <div className={cn("relative h-9 w-full touch-none select-none", className)}>
      <div
        ref={trackRef}
        className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted"
      >
        <div
          className="absolute top-0 bottom-0 bg-primary/25"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
      </div>
      <Handle position={startPct} onPointerDown={() => setDragging("start")} />
      <Handle position={endPct} onPointerDown={() => setDragging("end")} />
    </div>
  )
}

function Handle({
  position,
  onPointerDown,
}: {
  position: number
  onPointerDown: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        onPointerDown()
      }}
      style={{ left: `${position}%` }}
      aria-label="Trim handle"
      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm transition-transform hover:scale-110 active:scale-95"
    />
  )
}
