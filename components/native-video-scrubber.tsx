"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>
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

/**
 * Scrub bar for a native <video> element. The progress bar, thumb, hover
 * preview, and time label are written directly to the DOM via refs + RAF so
 * the parent tree never re-renders during playback. Only `playing` (driven by
 * the video's play/pause events) and `dragging` (user pointer down/up) flip
 * React state, both low-frequency.
 */
export function NativeVideoScrubber({ videoRef, className }: Props) {
  const [playing, setPlaying] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  const trackRef = React.useRef<HTMLDivElement>(null)
  const progressRef = React.useRef<HTMLDivElement>(null)
  const hoverRef = React.useRef<HTMLDivElement>(null)
  const thumbRef = React.useRef<HTMLDivElement>(null)
  const timeLabelRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const v = videoRef.current
    if (!v) return
    setPlaying(!v.paused)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener("play", onPlay)
    v.addEventListener("pause", onPause)
    return () => {
      v.removeEventListener("play", onPlay)
      v.removeEventListener("pause", onPause)
    }
  }, [videoRef])

  // RAF-driven imperative updates. We only touch the DOM when the percentage
  // changed perceptibly — paused playback costs one cheap property read per
  // animation frame and zero DOM writes.
  React.useEffect(() => {
    let raf = 0
    let lastPct = -1
    const tick = () => {
      const v = videoRef.current
      if (v) {
        const dur = v.duration
        if (isFinite(dur) && dur > 0) {
          const pct = Math.min(1, Math.max(0, v.currentTime / dur))
          if (Math.abs(pct - lastPct) > 0.0001) {
            lastPct = pct
            const pctStr = `${pct * 100}%`
            if (progressRef.current) progressRef.current.style.width = pctStr
            if (thumbRef.current) thumbRef.current.style.left = pctStr
            if (timeLabelRef.current) {
              timeLabelRef.current.textContent = `${formatTime(v.currentTime)} / ${formatTime(dur)}`
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoRef])

  const seekFromClient = React.useCallback(
    (clientX: number) => {
      const v = videoRef.current
      const track = trackRef.current
      if (!v || !track) return
      const dur = v.duration
      if (!isFinite(dur) || dur <= 0) return
      const rect = track.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      v.currentTime = t * dur
    },
    [videoRef]
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

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  const onTrackPointerMove = (e: React.PointerEvent) => {
    const track = trackRef.current
    const hover = hoverRef.current
    if (!track || !hover) return
    const rect = track.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    hover.style.width = `${pct * 100}%`
    hover.style.opacity = dragging ? "0" : "1"
  }

  const onTrackPointerLeave = () => {
    const hover = hoverRef.current
    if (hover) hover.style.opacity = "0"
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={cn("flex items-center gap-2.5", className)}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center text-white transition-transform hover:scale-110 active:scale-95",
          DROP
        )}
      >
        <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={16} />
      </button>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          e.preventDefault()
          setDragging(true)
          seekFromClient(e.clientX)
        }}
        onPointerMove={onTrackPointerMove}
        onPointerLeave={onTrackPointerLeave}
        className="group relative flex-1 cursor-pointer py-2"
      >
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-white/25 transition-[height]",
            dragging ? "h-[5px]" : "h-[3px] group-hover:h-[5px]"
          )}
        >
          <div
            ref={hoverRef}
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-full bg-white/40 transition-opacity"
            style={{ width: 0, opacity: 0 }}
          />
          <div
            ref={progressRef}
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: 0 }}
          />
        </div>
        <div
          ref={thumbRef}
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-transform",
            dragging ? "scale-110" : "scale-0 group-hover:scale-100"
          )}
          style={{ left: 0 }}
        />
      </div>
      <span
        ref={timeLabelRef}
        className={cn(
          "shrink-0 font-mono text-[10px] tracking-tight text-white/90 tnum",
          DROP
        )}
      >
        0:00 / 0:00
      </span>
    </div>
  )
}
