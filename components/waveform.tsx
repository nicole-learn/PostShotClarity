"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Props = {
  url: string | null
  duration: number
  start: number
  end: number
  className?: string
  bars?: number
}

async function extractPeaks(url: string, bars: number): Promise<number[]> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  type CtxCtor = { new (): AudioContext }
  type WindowLike = Window & { webkitAudioContext?: CtxCtor }
  const Ctor =
    (typeof window !== "undefined" &&
      (window.AudioContext ?? (window as WindowLike).webkitAudioContext)) ||
    null
  if (!Ctor) throw new Error("AudioContext unavailable")
  const ctx = new Ctor()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  const ch = decoded.getChannelData(0)
  const step = Math.max(1, Math.floor(ch.length / bars))
  const peaks: number[] = []
  for (let i = 0; i < bars; i++) {
    let max = 0
    const from = i * step
    const to = Math.min(ch.length, from + step)
    for (let j = from; j < to; j += 4) {
      const v = Math.abs(ch[j])
      if (v > max) max = v
    }
    peaks.push(max)
  }
  const mx = Math.max(...peaks, 0.001)
  return peaks.map((p) => p / mx)
}

export function Waveform({
  url,
  duration,
  start,
  end,
  className,
  bars = 96,
}: Props) {
  const [peaks, setPeaks] = React.useState<number[] | null>(null)

  React.useEffect(() => {
    if (!url) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeaks(null)
    extractPeaks(url, bars)
      .then((p) => !cancelled && setPeaks(p))
      .catch(() => {
        if (!cancelled) {
          setPeaks(
            Array.from({ length: bars }, (_, i) =>
              0.35 + 0.35 * Math.abs(Math.sin(i / 3.2))
            )
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [url, bars])

  const display =
    peaks ??
    Array.from({ length: bars }, (_, i) =>
      0.25 + 0.25 * Math.abs(Math.sin(i / 2.8))
    )

  const sPct = duration > 0 ? (start / duration) * 100 : 0
  const ePct = duration > 0 ? (end / duration) * 100 : 100

  return (
    <div className={cn("relative h-8 w-full", className)}>
      <div className="absolute inset-0 flex items-center gap-[2px]">
        {display.map((p, i) => {
          const x = (i / bars) * 100
          const active = x >= sPct && x <= ePct
          return (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-colors",
                active ? "bg-primary/80" : "bg-muted-foreground/30"
              )}
              style={{ height: `${Math.max(12, p * 100)}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}
