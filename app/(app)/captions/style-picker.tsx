"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CaptionStyle } from "@/compositions/captions/types"

const CLEAN_STROKE: React.CSSProperties = {
  WebkitTextStroke: "1px #000",
  paintOrder: "stroke fill",
  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
}

const THICK_STROKE: React.CSSProperties = {
  WebkitTextStroke: "1.5px #000",
  paintOrder: "stroke fill",
  textShadow: "0 2px 6px rgba(0,0,0,0.6)",
}

type Preview = { id: CaptionStyle; render: React.ReactNode }

const PREVIEWS: Preview[] = [
  {
    id: "clean",
    render: (
      <span
        style={{
          color: "#fff",
          fontWeight: 700,
          letterSpacing: -0.3,
          ...CLEAN_STROKE,
        }}
      >
        Clean
      </span>
    ),
  },
  {
    id: "pop",
    render: (
      <span
        style={{
          color: "#ffe34d",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: -0.5,
          ...THICK_STROKE,
        }}
      >
        POP
      </span>
    ),
  },
  {
    id: "karaoke",
    render: (
      <span style={{ fontWeight: 800, letterSpacing: -0.3 }}>
        <span style={{ color: "#fff", ...CLEAN_STROKE }}>Kar</span>
        <span style={{ color: "#4ae2d6", ...CLEAN_STROKE }}>aoke</span>
      </span>
    ),
  },
  {
    id: "neon",
    render: (
      <span
        style={{
          color: "#fdf0ff",
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          textShadow:
            "0 0 3px #ff4fe0, 0 0 10px #ff2dd4, 0 0 22px rgba(255,45,212,0.8)",
        }}
      >
        Neon
      </span>
    ),
  },
  {
    id: "impact",
    render: (
      <span
        style={{
          color: "#fff",
          fontWeight: 900,
          letterSpacing: -0.8,
          textTransform: "uppercase",
          WebkitTextStroke: "2px #000",
          paintOrder: "stroke fill",
          textShadow: "0 2px 6px rgba(0,0,0,0.5)",
        }}
      >
        Impact
      </span>
    ),
  },
  {
    id: "shadow",
    render: (
      <span
        style={{
          color: "#fff",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: -0.5,
          WebkitTextStroke: "1px #0a0a0a",
          paintOrder: "stroke fill",
          textShadow: "2px 2px 0 #ff5c79",
        }}
      >
        Shadow
      </span>
    ),
  },
  {
    id: "gradient",
    render: (
      <span
        style={{
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: -0.4,
          color: "transparent",
          backgroundImage:
            "linear-gradient(135deg, #ff7a8a 0%, #ff5eb2 35%, #b06bff 70%, #5a7bff 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
        }}
      >
        Gradient
      </span>
    ),
  },
  {
    id: "outlined",
    render: (
      <span
        style={{
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: -0.4,
          color: "transparent",
          WebkitTextStroke: "1.25px #ffffff",
          paintOrder: "stroke fill",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))",
        }}
      >
        Outlined
      </span>
    ),
  },
]

const INACTIVE_BG =
  "linear-gradient(135deg, oklch(0.26 0 0) 0%, oklch(0.13 0 0) 100%)"
const ACTIVE_BG =
  "linear-gradient(135deg, oklch(0.4 0 0) 0%, oklch(0.2 0 0) 100%)"

export function StylePicker({
  value,
  onChange,
}: {
  value: CaptionStyle
  onChange: (style: CaptionStyle) => void
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      {PREVIEWS.map((s) => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={active}
            title={s.id}
            className={cn(
              "relative flex min-h-[40px] flex-1 items-center justify-center overflow-hidden rounded-lg transition-all",
              active ? "shadow-e2" : "opacity-80 hover:opacity-100"
            )}
            style={{ background: active ? ACTIVE_BG : INACTIVE_BG }}
          >
            <span className="text-[13px] leading-none">{s.render}</span>
          </button>
        )
      })}
    </div>
  )
}
