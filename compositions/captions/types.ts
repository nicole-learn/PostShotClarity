export type TranscribedWord = {
  word: string
  start: number
  end: number
}

export type CaptionLine = {
  id: string
  text: string
  start: number
  end: number
  words: TranscribedWord[]
}

export const CAPTION_STYLES = [
  "clean",
  "pop",
  "karaoke",
  "neon",
  "impact",
  "shadow",
  "gradient",
  "outlined",
] as const

export type CaptionStyle = (typeof CAPTION_STYLES)[number]

export const CAPTION_ANIMATIONS = [
  "fade",
  "pop",
  "slide",
  "none",
] as const

export type CaptionAnimation = (typeof CAPTION_ANIMATIONS)[number]

/**
 * Anchor + scale layout model — text is centered on (x, y) and sized by
 * `scale` relative to a per-style baseline. `maxCharsPerLine` controls
 * re-chunking by visible character budget (spaces counted): 0 = render
 * each caption line as-is; N>0 = pack whole words greedily until the
 * next word would push the chunk past N characters.
 */
export type CaptionLayout = {
  x: number
  y: number
  scale: number
  maxCharsPerLine: number
}

export const DEFAULT_CAPTION_LAYOUT: CaptionLayout = {
  x: 0.5,
  y: 0.82,
  scale: 1,
  maxCharsPerLine: 0,
}

export const CAPTION_SCALE_MIN = 0.4
export const CAPTION_SCALE_MAX = 3

export const SAFE_ZONE_WIDTH = 0.9

/* --------------------------- Per-style presets -------------------------- */

export type CleanPreset = { id: string; text: string }
export type PopPreset = { id: string; text: string; active: string }
export type KaraokePreset = {
  id: string
  text: string
  fill: string
  inactive: string
}
export type NeonPreset = { id: string; glow: string; text: string }
export type ImpactPreset = { id: string; text: string }
export type ShadowPreset = { id: string; text: string; shadow: string }
export type GradientPreset = { id: string; colors: string[] }
export type OutlinedPreset = { id: string; stroke: string }

export type StylePresetMap = {
  clean: CleanPreset
  pop: PopPreset
  karaoke: KaraokePreset
  neon: NeonPreset
  impact: ImpactPreset
  shadow: ShadowPreset
  gradient: GradientPreset
  outlined: OutlinedPreset
}

export const STYLE_PRESETS: {
  [K in CaptionStyle]: StylePresetMap[K][]
} = {
  clean: [
    { id: "white", text: "#ffffff" },
    { id: "yellow", text: "#ffe34d" },
    { id: "mint", text: "#a8f5c5" },
    { id: "coral", text: "#ffa0ae" },
    { id: "sky", text: "#a8d8ff" },
  ],
  pop: [
    { id: "yellow", text: "#ffffff", active: "#ffe34d" },
    { id: "red", text: "#ffffff", active: "#ff5566" },
    { id: "cyan", text: "#ffffff", active: "#36e2ff" },
    { id: "pink", text: "#ffffff", active: "#ff6ec7" },
    { id: "green", text: "#ffffff", active: "#6fff88" },
  ],
  karaoke: [
    { id: "cyan", text: "#ffffff", fill: "#4ae2d6", inactive: "rgba(255,255,255,0.5)" },
    { id: "pink", text: "#ffffff", fill: "#ff6ec7", inactive: "rgba(255,255,255,0.5)" },
    { id: "yellow", text: "#ffffff", fill: "#ffe34d", inactive: "rgba(255,255,255,0.5)" },
    { id: "green", text: "#ffffff", fill: "#6fff88", inactive: "rgba(255,255,255,0.5)" },
    { id: "purple", text: "#ffffff", fill: "#c084fc", inactive: "rgba(255,255,255,0.5)" },
  ],
  neon: [
    { id: "pink", glow: "#ff2dd4", text: "#fdf0ff" },
    { id: "cyan", glow: "#2dd4ff", text: "#f0fbff" },
    { id: "green", glow: "#2dff7f", text: "#f0fff5" },
    { id: "orange", glow: "#ff7f2d", text: "#fff4eb" },
    { id: "violet", glow: "#8b5cf6", text: "#f5f0ff" },
  ],
  impact: [
    { id: "white", text: "#ffffff" },
    { id: "yellow", text: "#ffe34d" },
    { id: "red", text: "#ff5566" },
    { id: "cyan", text: "#36e2ff" },
    { id: "lime", text: "#bfff4d" },
  ],
  shadow: [
    { id: "coral", text: "#ffffff", shadow: "#ff5c79" },
    { id: "blue", text: "#ffffff", shadow: "#5c8fff" },
    { id: "green", text: "#ffffff", shadow: "#42e08b" },
    { id: "yellow", text: "#ffffff", shadow: "#ffd24a" },
    { id: "black", text: "#ffffff", shadow: "#0a0a0a" },
  ],
  gradient: [
    { id: "sunset", colors: ["#ff7a8a", "#ff5eb2", "#b06bff", "#5a7bff"] },
    { id: "fire", colors: ["#ffb347", "#ff6a3d", "#d62246"] },
    { id: "ocean", colors: ["#2dd4bf", "#0ea5e9", "#6366f1"] },
    { id: "pastel", colors: ["#fda4af", "#c4b5fd", "#93c5fd"] },
    { id: "gold", colors: ["#fde047", "#fbbf24", "#f97316"] },
  ],
  outlined: [
    { id: "white", stroke: "#ffffff" },
    { id: "black", stroke: "#0a0a0a" },
    { id: "yellow", stroke: "#ffe34d" },
    { id: "cyan", stroke: "#36e2ff" },
    { id: "pink", stroke: "#ff6ec7" },
  ],
}

export type CaptionPresetIndex = Record<CaptionStyle, number>

export const DEFAULT_PRESET_INDEX: CaptionPresetIndex = {
  clean: 0,
  pop: 0,
  karaoke: 0,
  neon: 0,
  impact: 0,
  shadow: 0,
  gradient: 0,
  outlined: 0,
}

export type CaptionsProps = {
  videoSrc: string
  lines: CaptionLine[]
  style: CaptionStyle
  layout?: CaptionLayout
  animation?: CaptionAnimation
  presetIndex?: CaptionPresetIndex
  /** Server-side rendering only. The Player keeps the regular Video component. */
  useOffthread?: boolean
  /** Set by the client so Lambda can size the composition. */
  durationInFrames?: number
  fps?: number
  width?: number
  height?: number
}

export const DEFAULT_CAPTION_FPS = 30
