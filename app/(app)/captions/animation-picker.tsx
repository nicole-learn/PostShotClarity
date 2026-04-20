"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CaptionAnimation } from "@/compositions/captions/types"

const ANIMATIONS: Array<{
  id: CaptionAnimation
  label: string
  hint: string
}> = [
  { id: "fade", label: "Fade", hint: "Soft opacity" },
  { id: "pop", label: "Pop", hint: "Spring scale" },
  { id: "slide", label: "Slide", hint: "Rise from below" },
  { id: "none", label: "None", hint: "Instant" },
]

const INACTIVE_BG =
  "linear-gradient(135deg, oklch(0.26 0 0) 0%, oklch(0.13 0 0) 100%)"
const ACTIVE_BG =
  "linear-gradient(135deg, oklch(0.4 0 0) 0%, oklch(0.2 0 0) 100%)"

export function AnimationPicker({
  value,
  onChange,
}: {
  value: CaptionAnimation
  onChange: (v: CaptionAnimation) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {ANIMATIONS.map((a) => {
        const active = a.id === value
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            aria-pressed={active}
            className={cn(
              "flex h-12 items-center gap-2.5 rounded-lg px-3 text-left transition-all",
              active ? "shadow-e2" : "opacity-80 hover:opacity-100"
            )}
            style={{ background: active ? ACTIVE_BG : INACTIVE_BG }}
          >
            <AnimationGlyph id={a.id} />
            <div className="flex min-w-0 flex-col">
              <span className="text-[12px] leading-none font-semibold tracking-tight text-foreground">
                {a.label}
              </span>
              <span className="mt-1 truncate text-[10px] leading-none text-muted-foreground">
                {a.hint}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AnimationGlyph({ id }: { id: CaptionAnimation }) {
  const common =
    "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/10 text-[10px] font-semibold tracking-tight text-foreground"
  switch (id) {
    case "fade":
      return (
        <div className={common}>
          <span style={{ opacity: 0.7 }}>Aa</span>
        </div>
      )
    case "pop":
      return (
        <div className={common}>
          <span style={{ transform: "scale(1.15)", display: "inline-block" }}>
            Aa
          </span>
        </div>
      )
    case "slide":
      return (
        <div className={common}>
          <span style={{ transform: "translateY(-1px)", display: "inline-block" }}>
            Aa
          </span>
        </div>
      )
    case "none":
    default:
      return <div className={common}>Aa</div>
  }
}
