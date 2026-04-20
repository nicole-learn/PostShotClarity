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
  "minimal",
  "impact",
  "highlight",
  "typewriter",
  "bubble",
  "shadow",
] as const

export type CaptionStyle = (typeof CAPTION_STYLES)[number]

/**
 * Anchor + scale layout model — text is centered on (x, y) and sized by
 * `scale` relative to a per-style baseline. `maxWordsPerLine` controls
 * re-chunking: 0 = render each caption line as-is; N>0 = show at most N
 * words on screen at once, with the remainder sliding in sequentially
 * across the line's time window.
 */
export type CaptionLayout = {
  x: number
  y: number
  scale: number
  maxWordsPerLine: number
}

export const DEFAULT_CAPTION_LAYOUT: CaptionLayout = {
  x: 0.5,
  y: 0.82,
  scale: 1,
  maxWordsPerLine: 0,
}

export const CAPTION_SCALE_MIN = 0.4
export const CAPTION_SCALE_MAX = 3

export const SAFE_ZONE_WIDTH = 0.9

export type CaptionsProps = {
  videoSrc: string
  lines: CaptionLine[]
  style: CaptionStyle
  layout?: CaptionLayout
  /** Server-side rendering only. The Player keeps the regular Video component. */
  useOffthread?: boolean
  /** Set by the client so Lambda can size the composition. */
  durationInFrames?: number
  fps?: number
  width?: number
  height?: number
}

export const DEFAULT_CAPTION_FPS = 30
