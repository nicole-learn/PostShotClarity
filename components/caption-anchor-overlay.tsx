"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  CAPTION_SCALE_MAX,
  CAPTION_SCALE_MIN,
  SAFE_ZONE_WIDTH,
  type CaptionLayout,
} from "@/compositions/captions/types"

type Props = {
  layout: CaptionLayout
  onChange: (next: CaptionLayout) => void
  disabled?: boolean
}

type Interaction =
  | { kind: "move"; pointerStart: { x: number; y: number }; anchorStart: { x: number; y: number } }
  | { kind: "scale"; pointerStart: { x: number; y: number }; scaleStart: number; initialDist: number }
  | null

const SNAPS_X = [0.5, 1 / 3, 2 / 3, 1 - SAFE_ZONE_WIDTH / 2, (1 + SAFE_ZONE_WIDTH) / 2] as const
const SNAPS_Y = [0.5, 1 / 3, 2 / 3, 0.2, 0.8] as const
const SNAP_THRESHOLD = 0.015

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function snap(value: number, targets: readonly number[]): {
  value: number
  snapped: number | null
} {
  for (const t of targets) {
    if (Math.abs(value - t) < SNAP_THRESHOLD) {
      return { value: t, snapped: t }
    }
  }
  return { value, snapped: null }
}

/**
 * Visual bounding box for the anchored caption. Size reflects the current
 * scale so the user gets a sense of how big the rendered text will be, with
 * sensible min/max so the handles remain clickable even at extreme scales.
 */
function anchorBox(layout: CaptionLayout) {
  const w = clamp(0.45 * layout.scale, 0.14, SAFE_ZONE_WIDTH)
  const h = clamp(0.12 * layout.scale, 0.06, 0.42)
  return {
    left: layout.x - w / 2,
    top: layout.y - h / 2,
    width: w,
    height: h,
  }
}

export function CaptionAnchorOverlay({ layout, onChange, disabled }: Props) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [selected, setSelected] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const [mode, setMode] = React.useState<Interaction>(null)
  const [snapLines, setSnapLines] = React.useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  })

  const box = anchorBox(layout)

  const getParentRect = React.useCallback(() => {
    return wrapperRef.current?.parentElement?.getBoundingClientRect() ?? null
  }, [])

  const toNormalized = React.useCallback(
    (clientX: number, clientY: number) => {
      const pr = getParentRect()
      if (!pr) return { x: 0, y: 0 }
      return {
        x: (clientX - pr.left) / pr.width,
        y: (clientY - pr.top) / pr.height,
      }
    },
    [getParentRect]
  )

  React.useEffect(() => {
    if (!mode) return

    const onMove = (e: PointerEvent) => {
      const p = toNormalized(e.clientX, e.clientY)

      if (mode.kind === "move") {
        const dx = p.x - mode.pointerStart.x
        const dy = p.y - mode.pointerStart.y
        let nx = mode.anchorStart.x + dx
        let ny = mode.anchorStart.y + dy

        const sx = snap(nx, SNAPS_X)
        const sy = snap(ny, SNAPS_Y)
        nx = sx.value
        ny = sy.value
        setSnapLines({ x: sx.snapped, y: sy.snapped })

        onChange({
          ...layout,
          x: clamp(nx, 0.02, 0.98),
          y: clamp(ny, 0.02, 0.98),
        })
      } else {
        const dx = p.x - layout.x
        const dy = p.y - layout.y
        const dist = Math.hypot(dx, dy)
        const safeInitial = Math.max(mode.initialDist, 0.002)
        const ratio = dist / safeInitial
        const next = clamp(
          mode.scaleStart * ratio,
          CAPTION_SCALE_MIN,
          CAPTION_SCALE_MAX
        )
        onChange({ ...layout, scale: next })
      }
    }

    const onUp = () => {
      setMode(null)
      setSnapLines({ x: null, y: null })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [mode, layout, onChange, toNormalized])

  React.useEffect(() => {
    if (!selected || disabled) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return
      const step = e.shiftKey ? 0.05 : 0.01
      let dx = 0
      let dy = 0
      if (e.key === "ArrowLeft") dx = -step
      else if (e.key === "ArrowRight") dx = step
      else if (e.key === "ArrowUp") dy = -step
      else if (e.key === "ArrowDown") dy = step
      else return
      e.preventDefault()
      onChange({
        ...layout,
        x: clamp(layout.x + dx, 0.02, 0.98),
        y: clamp(layout.y + dy, 0.02, 0.98),
      })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected, disabled, layout, onChange])

  const startMove = (e: React.PointerEvent) => {
    if (disabled) return
    e.stopPropagation()
    e.preventDefault()
    setSelected(true)
    const p = toNormalized(e.clientX, e.clientY)
    setMode({
      kind: "move",
      pointerStart: p,
      anchorStart: { x: layout.x, y: layout.y },
    })
  }

  const startScale = (e: React.PointerEvent) => {
    if (disabled) return
    e.stopPropagation()
    e.preventDefault()
    const p = toNormalized(e.clientX, e.clientY)
    const initialDist = Math.hypot(p.x - layout.x, p.y - layout.y)
    setMode({
      kind: "scale",
      pointerStart: p,
      scaleStart: layout.scale,
      initialDist,
    })
  }

  const clickOutside = (e: React.PointerEvent) => {
    if (e.currentTarget === e.target) setSelected(false)
  }

  const showChrome = selected || hovered || mode !== null
  const showHandle = selected || mode?.kind === "scale"

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      onPointerDown={clickOutside}
      style={{ pointerEvents: "none" }}
    >
      {/* Catch-all transparent layer that deselects on background clicks. */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: selected ? "auto" : "none" }}
        onPointerDown={clickOutside}
      />

      {/* Snap guides (only while dragging). */}
      {mode?.kind === "move" && snapLines.x !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/80"
          style={{ left: `${snapLines.x * 100}%` }}
        />
      )}
      {mode?.kind === "move" && snapLines.y !== null && (
        <div
          className="pointer-events-none absolute right-0 left-0 h-px bg-primary/80"
          style={{ top: `${snapLines.y * 100}%` }}
        />
      )}

      {/* The caption bounding box itself. */}
      <div
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={startMove}
        className={cn(
          "absolute cursor-grab rounded-md transition-[border-color,box-shadow] duration-100 active:cursor-grabbing",
          showChrome
            ? "border border-dashed border-white/90 ring-1 ring-black/30"
            : "border border-transparent"
        )}
        style={{
          left: `${box.left * 100}%`,
          top: `${box.top * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
          pointerEvents: "auto",
        }}
      >
        {/* Drag-state corner badge. */}
        {mode?.kind === "move" && (
          <span className="pointer-events-none absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-primary-foreground uppercase">
            {Math.round(layout.x * 100)}% · {Math.round(layout.y * 100)}%
          </span>
        )}
        {mode?.kind === "scale" && (
          <span className="pointer-events-none absolute -top-6 right-0 rounded bg-primary px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-primary-foreground uppercase">
            {Math.round(layout.scale * 100)}%
          </span>
        )}

        {/* Single scale handle in the bottom-right. */}
        {showHandle && (
          <button
            type="button"
            aria-label="Resize captions"
            onPointerDown={startScale}
            className="absolute -right-1.5 -bottom-1.5 size-4 cursor-se-resize rounded-full border-2 border-white bg-primary shadow-e2 ring-1 ring-black/40"
            style={{ pointerEvents: "auto" }}
          />
        )}
      </div>
    </div>
  )
}
