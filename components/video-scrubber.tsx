"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type Props = {
  playing: boolean
  currentFrame: number
  durationInFrames: number
  fps: number
  onTogglePlay: () => void
  onSeek: (frame: number) => void
  className?: string
}

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

const DROP = "drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"

export function VideoScrubber({
  playing,
  currentFrame,
  durationInFrames,
  fps,
  onTogglePlay,
  onSeek,
  className,
}: Props) {
  const lastFrame = Math.max(1, durationInFrames - 1)
  const frame = Math.min(lastFrame, Math.max(0, currentFrame))
  const current = frame / fps
  const total = durationInFrames / fps

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={cn("flex items-center gap-2.5", className)}
    >
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center text-white transition-transform hover:scale-110 active:scale-95",
          DROP
        )}
      >
        <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={16} />
      </button>
      <ScrubberTrack frame={frame} lastFrame={lastFrame} onSeek={onSeek} />
      <span
        className={cn(
          "shrink-0 font-mono text-[10px] tracking-tight text-white/90 tnum",
          DROP
        )}
      >
        {formatTime(current)} / {formatTime(total)}
      </span>
    </div>
  )
}

function ScrubberTrack({
  frame,
  lastFrame,
  onSeek,
}: {
  frame: number
  lastFrame: number
  onSeek: (frame: number) => void
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [hoverX, setHoverX] = React.useState<number | null>(null)
  const progress = frame / lastFrame

  const seekFromClient = React.useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      onSeek(Math.round(t * lastFrame))
    },
    [lastFrame, onSeek]
  )

  React.useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => seekFromClient(e.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [dragging, seekFromClient])

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        e.preventDefault()
        setDragging(true)
        seekFromClient(e.clientX)
      }}
      onPointerMove={(e) => {
        const rect = trackRef.current?.getBoundingClientRect()
        if (!rect) return
        setHoverX(
          Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        )
      }}
      onPointerLeave={() => setHoverX(null)}
      className="group relative flex-1 cursor-pointer py-2"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-white/25 transition-[height]",
          dragging ? "h-[5px]" : "h-[3px] group-hover:h-[5px]"
        )}
      >
        {hoverX !== null && !dragging && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            style={{ width: `${hoverX * 100}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-transform",
          dragging ? "scale-110" : "scale-0 group-hover:scale-100"
        )}
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  )
}
