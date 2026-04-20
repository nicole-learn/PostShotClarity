"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  STYLE_PRESETS,
  type CaptionStyle,
  type StylePresetMap,
} from "@/compositions/captions/types"

/** Extracts the "signature colors" that visually define a preset, so a small
 *  swatch can stand in for the full rendered caption. */
function presetColors<S extends CaptionStyle>(
  style: S,
  preset: StylePresetMap[S]
): string[] {
  switch (style) {
    case "clean":
    case "impact":
      return [(preset as StylePresetMap["clean"]).text]
    case "outlined":
      return [(preset as StylePresetMap["outlined"]).stroke]
    case "pop": {
      const p = preset as StylePresetMap["pop"]
      return [p.text, p.active]
    }
    case "karaoke": {
      const p = preset as StylePresetMap["karaoke"]
      return [p.fill, p.text]
    }
    case "neon": {
      const p = preset as StylePresetMap["neon"]
      return [p.glow]
    }
    case "shadow": {
      const p = preset as StylePresetMap["shadow"]
      return [p.text, p.shadow]
    }
    case "gradient":
      return (preset as StylePresetMap["gradient"]).colors
    default:
      return ["#ffffff"]
  }
}

const TEXT_SIZE = "text-[17px]"
const OUTLINE_SHADOW =
  "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000"

function Swatch({
  colors,
  style,
}: {
  colors: string[]
  style: CaptionStyle
}) {
  if (style === "gradient" || colors.length >= 3) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors.join(", ")})`,
        }}
      />
    )
  }
  if (colors.length === 2) {
    if (style === "shadow") {
      return (
        <span
          className={cn(
            "relative font-black uppercase leading-none tracking-tight",
            TEXT_SIZE
          )}
          style={{
            color: colors[0],
            textShadow: `2.5px 2.5px 0 ${colors[1]}`,
            WebkitTextStroke: "1px #0a0a0a",
            paintOrder: "stroke fill",
          }}
        >
          Ab
        </span>
      )
    }
    // Pop / karaoke: show both colors in "Aa".
    return (
      <span className={cn("font-black tracking-tight leading-none", TEXT_SIZE)}>
        <span style={{ color: colors[0], textShadow: OUTLINE_SHADOW }}>A</span>
        <span style={{ color: colors[1], textShadow: OUTLINE_SHADOW }}>a</span>
      </span>
    )
  }
  // Single color
  if (style === "neon") {
    return (
      <span
        className={cn(
          "font-bold uppercase leading-none tracking-[2px]",
          TEXT_SIZE
        )}
        style={{
          color: "#fdf0ff",
          textShadow: `0 0 3px ${colors[0]}, 0 0 10px ${colors[0]}, 0 0 20px ${colors[0]}`,
        }}
      >
        Aa
      </span>
    )
  }
  if (style === "outlined") {
    return (
      <span
        className={cn(
          "font-black uppercase leading-none tracking-tight",
          TEXT_SIZE
        )}
        style={{
          color: "transparent",
          WebkitTextStroke: `1.5px ${colors[0]}`,
          paintOrder: "stroke fill",
        }}
      >
        Ab
      </span>
    )
  }
  // clean / impact / fallback
  return (
    <span
      className={cn("font-bold tracking-tight leading-none", TEXT_SIZE)}
      style={{
        color: colors[0],
        textShadow: OUTLINE_SHADOW,
      }}
    >
      Aa
    </span>
  )
}

const INACTIVE_BG =
  "linear-gradient(135deg, oklch(0.26 0 0) 0%, oklch(0.13 0 0) 100%)"
const ACTIVE_BG =
  "linear-gradient(135deg, oklch(0.4 0 0) 0%, oklch(0.2 0 0) 100%)"

export function ColorPicker<S extends CaptionStyle>({
  style,
  value,
  onChange,
}: {
  style: S
  value: number
  onChange: (next: number) => void
}) {
  const presets = STYLE_PRESETS[style] as StylePresetMap[S][]
  return (
    <div className="flex h-full flex-col gap-1.5">
      {presets.map((preset, i) => {
        const active = i === value
        const colors = presetColors(style, preset)
        return (
          <button
            key={(preset as { id: string }).id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(i)}
            title={(preset as { id: string }).id}
            className={cn(
              "relative flex min-h-[40px] flex-1 items-center justify-center overflow-hidden rounded-lg transition-all",
              active ? "shadow-e2" : "opacity-80 hover:opacity-100"
            )}
            style={{ background: active ? ACTIVE_BG : INACTIVE_BG }}
          >
            <Swatch colors={colors} style={style} />
          </button>
        )
      })}
    </div>
  )
}
