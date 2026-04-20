"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CaptionStyle } from "@/compositions/captions/types"

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'

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
    id: "minimal",
    render: (
      <span
        style={{
          background: "rgba(0,0,0,0.58)",
          color: "#fff",
          padding: "3px 9px",
          borderRadius: 5,
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: 0.15,
        }}
      >
        Minimal
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
    id: "highlight",
    render: (
      <span
        style={{
          color: "#0b0b0b",
          fontWeight: 800,
          padding: "2px 7px",
          background: "#ffe94d",
          borderRadius: 4,
          letterSpacing: -0.2,
        }}
      >
        Highlight
      </span>
    ),
  },
  {
    id: "typewriter",
    render: (
      <span
        style={{
          color: "#fff",
          background: "rgba(0,0,0,0.55)",
          padding: "3px 8px",
          borderRadius: 4,
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        Typed
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 11,
            background: "#fff",
            marginLeft: 3,
            verticalAlign: "-2px",
          }}
        />
      </span>
    ),
  },
  {
    id: "bubble",
    render: (
      <span
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,244,246,0.96) 100%)",
          color: "#111",
          padding: "4px 11px",
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: -0.2,
          boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
        }}
      >
        Bubble
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
]

export function StylePicker({
  value,
  onChange,
}: {
  value: CaptionStyle
  onChange: (style: CaptionStyle) => void
}) {
  return (
    <div className="flex flex-col gap-2">
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
              "relative flex h-16 items-center justify-center overflow-hidden rounded-lg transition-all",
              active
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:brightness-110"
            )}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.3 0 0) 0%, oklch(0.14 0 0) 100%)",
            }}
          >
            <span className="text-[13px] leading-none">{s.render}</span>
          </button>
        )
      })}
    </div>
  )
}
