import * as React from "react"
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"

import { chunkLines, type CaptionChunk } from "./chunk"
import {
  DEFAULT_CAPTION_LAYOUT,
  DEFAULT_PRESET_INDEX,
  SAFE_ZONE_WIDTH,
  STYLE_PRESETS,
  type CaptionAnimation,
  type CaptionLayout,
  type CaptionPresetIndex,
  type CaptionStyle,
  type CaptionsProps,
  type CleanPreset,
  type GradientPreset,
  type ImpactPreset,
  type KaraokePreset,
  type NeonPreset,
  type OutlinedPreset,
  type PopPreset,
  type ShadowPreset,
  type StylePresetMap,
} from "./types"

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif'

const STYLE_BASE_FONT: Record<CaptionStyle, number> = {
  clean: 0.065,
  pop: 0.082,
  karaoke: 0.07,
  neon: 0.072,
  impact: 0.094,
  shadow: 0.086,
  gradient: 0.084,
  outlined: 0.09,
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const IDLE_ANIM = { opacity: 1, transform: "none" } as const

export const Captions: React.FC<CaptionsProps> = ({
  videoSrc,
  lines,
  style,
  layout,
  animation = "fade",
  presetIndex,
  useOffthread = false,
}) => {
  const { fps } = useVideoConfig()
  const VideoComp = useOffthread ? OffthreadVideo : Video
  const effective = layout ?? DEFAULT_CAPTION_LAYOUT
  const presets = presetIndex ?? DEFAULT_PRESET_INDEX
  const preset = resolvePreset(style, presets)

  const effectiveMaxChars = React.useMemo(() => {
    // "Auto" (slider = 0) → one word per chunk for a punchy, modern feel.
    if (effective.maxCharsPerLine <= 0) return 1
    return Math.max(1, Math.round(effective.maxCharsPerLine))
  }, [effective.maxCharsPerLine])

  const chunks = React.useMemo(
    () => chunkLines(lines, effectiveMaxChars),
    [lines, effectiveMaxChars]
  )

  return (
    <AbsoluteFill style={{ background: "black" }}>
      {videoSrc ? <VideoComp src={videoSrc} /> : null}
      {chunks.map((chunk, i) => {
        const from = Math.max(0, Math.round(chunk.start * fps))
        const rawDur = Math.max(
          1,
          Math.round((chunk.end - chunk.start) * fps)
        )
        // Clamp each chunk's end to the next chunk's start. Without this,
        // ASR-provided word timings that slightly overlap (common on fast
        // speech) + `Math.max(lastEnd, nextStart)` in chunkLines make two
        // Sequences active on the same frame, painting both captions.
        const nextFrom =
          i + 1 < chunks.length
            ? Math.max(0, Math.round(chunks[i + 1].start * fps))
            : Infinity
        const dur = Math.max(1, Math.min(rawDur, nextFrom - from))
        return (
          <Sequence
            key={chunk.id}
            from={from}
            durationInFrames={dur}
            // Pre-mount ~8 frames early so the DOM and first paint happen
            // before the chunk is visible. Eliminates main-thread stalls at
            // the boundary — which otherwise cause Remotion's <Video> to
            // seek backward to resync, re-playing the caption animation.
            premountFor={8}
          >
            <ChunkRouter
              chunk={chunk}
              style={style}
              layout={effective}
              animation={animation}
              preset={preset}
            />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

function resolvePreset<S extends CaptionStyle>(
  style: S,
  index: CaptionPresetIndex
): StylePresetMap[S] {
  const presets = STYLE_PRESETS[style]
  const i = Math.max(0, Math.min(presets.length - 1, index[style] ?? 0))
  return presets[i] as StylePresetMap[S]
}

type RouterProps<S extends CaptionStyle = CaptionStyle> = {
  chunk: CaptionChunk
  style: S
  layout: CaptionLayout
  animation: CaptionAnimation
  preset: StylePresetMap[S]
}

function ChunkRouter({
  chunk,
  style,
  layout,
  animation,
  preset,
}: RouterProps) {
  switch (style) {
    case "pop":
      return (
        <PopStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as PopPreset}
        />
      )
    case "karaoke":
      return (
        <KaraokeStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as KaraokePreset}
        />
      )
    case "neon":
      return (
        <NeonStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as NeonPreset}
        />
      )
    case "impact":
      return (
        <ImpactStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as ImpactPreset}
        />
      )
    case "shadow":
      return (
        <ShadowStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as ShadowPreset}
        />
      )
    case "gradient":
      return (
        <GradientStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as GradientPreset}
        />
      )
    case "outlined":
      return (
        <OutlinedStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as OutlinedPreset}
        />
      )
    case "clean":
    default:
      return (
        <CleanStyle
          chunk={chunk}
          layout={layout}
          animation={animation}
          preset={preset as CleanPreset}
        />
      )
  }
}

function useFontSize(style: CaptionStyle, scale: number) {
  const { height } = useVideoConfig()
  return Math.max(14, Math.round(height * STYLE_BASE_FONT[style] * scale))
}

/** Chunk entry animation. Returns a wrapper style to merge on the style's
 *  text block. All animations share a short 4-frame base for snappiness. */
function useAnimation(kind: CaptionAnimation): {
  opacity: number
  transform: string
} {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (kind === "none") return IDLE_ANIM

  if (kind === "fade") {
    if (frame >= 4) return IDLE_ANIM
    const t = easeOutCubic(frame / 4)
    return { opacity: t, transform: "none" }
  }

  if (kind === "slide") {
    if (frame >= 6) return IDLE_ANIM
    const t = easeOutCubic(frame / 6)
    return {
      opacity: t,
      transform: `translateY(${(1 - t) * 18}px)`,
    }
  }

  // pop (spring). At these constants the spring is settled well before 24f.
  if (frame >= 24) return IDLE_ANIM
  const s = spring({
    fps,
    frame,
    config: { damping: 12, stiffness: 260, mass: 0.5 },
  })
  return {
    opacity: Math.max(0, Math.min(1, s * 1.3)),
    transform: `scale(${interpolate(s, [0, 1], [0.82, 1])})`,
  }
}

function AnchorBox({
  layout,
  children,
  fullWidth = true,
}: {
  layout: CaptionLayout
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: `${layout.x * 100}%`,
          top: `${layout.y * 100}%`,
          width: fullWidth ? `${SAFE_ZONE_WIDTH * 100}%` : undefined,
          transform: "translate(-50%, -50%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  )
}

const CLEAN_STROKE = {
  WebkitTextStroke: "1.5px #000",
  paintOrder: "stroke fill" as const,
  textShadow: "0 3px 8px rgba(0,0,0,0.55)",
}

const THICK_STROKE = {
  WebkitTextStroke: "2.5px #000",
  paintOrder: "stroke fill" as const,
  textShadow: "0 4px 10px rgba(0,0,0,0.55)",
}

type StyleChildProps<P> = {
  chunk: CaptionChunk
  layout: CaptionLayout
  animation: CaptionAnimation
  preset: P
}

/**
 * Compensates for CSS letter-spacing's phantom trailing space so centered text
 * actually looks centered. For positive letter-spacing the advance box has
 * empty space on the right; for negative letter-spacing the visible glyphs
 * overflow past the advance box. Either way, the offset is exactly
 * |letterSpacing| and is corrected with marginRight: -letterSpacing on an
 * inline-block wrapper.
 */
function TextBox({
  letterSpacing,
  children,
  style,
}: {
  letterSpacing: number
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        ...style,
        display: "inline-block",
        marginRight: -letterSpacing,
      }}
    >
      {children}
    </span>
  )
}

/* ----------------------------- Style: Clean ----------------------------- */

function CleanStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<CleanPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("clean", layout.scale)
  const letterSpacing = -0.3
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          color: preset.text,
          letterSpacing,
          lineHeight: 1.2,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          ...CLEAN_STROKE,
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/* ------------------------------ Style: Pop ------------------------------ */

function PopStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<PopPreset>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const anim = useAnimation(animation)
  const size = useFontSize("pop", layout.scale)
  const letterSpacing = -0.6
  const rel = frame / fps + chunk.start
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${size * 0.18}px`,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          textTransform: "uppercase",
          letterSpacing,
          lineHeight: 1.05,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
        }}
      >
        {chunk.words.map((w, i) => {
          const active = rel >= w.start && rel < w.end
          return (
            <span
              key={i}
              style={{
                color: active ? preset.active : preset.text,
                marginRight: -letterSpacing,
                ...THICK_STROKE,
              }}
            >
              {w.word}
            </span>
          )
        })}
      </div>
    </AnchorBox>
  )
}

/* ---------------------------- Style: Karaoke ---------------------------- */

function KaraokeStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<KaraokePreset>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const anim = useAnimation(animation)
  const size = useFontSize("karaoke", layout.scale)
  const letterSpacing = -0.3
  const rel = frame / fps + chunk.start
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${size * 0.28}px`,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.15,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
        }}
      >
        {chunk.words.map((w, i) => {
          const fillEnd = Math.max(
            w.start + 0.02,
            Math.min(w.end, w.start + 0.12)
          )
          const t = interpolate(rel, [w.start, fillEnd], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
          const color =
            t >= 1 ? preset.text : t > 0 ? preset.fill : preset.inactive
          return (
            <span
              key={i}
              style={{
                color,
                marginRight: -letterSpacing,
                ...CLEAN_STROKE,
              }}
            >
              {w.word}
            </span>
          )
        })}
      </div>
    </AnchorBox>
  )
}

/* ------------------------------ Style: Neon ----------------------------- */

function NeonStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<NeonPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("neon", layout.scale)
  const letterSpacing = 1.8
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.15,
          textTransform: "uppercase",
          color: preset.text,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          textShadow: `0 0 3px ${preset.glow}, 0 0 10px ${preset.glow}, 0 0 22px ${preset.glow}, 0 0 48px ${rgba(preset.glow, 0.55)}`,
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/* ----------------------------- Style: Impact ---------------------------- */

function ImpactStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<ImpactPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("impact", layout.scale)
  const letterSpacing = -1.5
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.02,
          textTransform: "uppercase",
          color: preset.text,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          WebkitTextStroke: `${Math.max(2, Math.round(size * 0.05))}px #000`,
          paintOrder: "stroke fill",
          textShadow: "0 6px 16px rgba(0,0,0,0.5)",
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/* ----------------------------- Style: Shadow ---------------------------- */

function ShadowStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<ShadowPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("shadow", layout.scale)
  const offset = Math.max(3, Math.round(size * 0.05))
  const letterSpacing = -1.2
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.02,
          textTransform: "uppercase",
          color: preset.text,
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          WebkitTextStroke: "1.5px #0a0a0a",
          paintOrder: "stroke fill",
          textShadow: `${offset}px ${offset}px 0 ${preset.shadow}, ${offset * 2 + 2}px ${offset * 2 + 2}px 14px rgba(0,0,0,0.35)`,
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/* ---------------------------- Style: Gradient --------------------------- */

function GradientStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<GradientPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("gradient", layout.scale)
  const letterSpacing = -1
  const stops =
    preset.colors.length > 1
      ? preset.colors.join(", ")
      : `${preset.colors[0]}, ${preset.colors[0]}`
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.05,
          textTransform: "uppercase",
          color: "transparent",
          backgroundImage: `linear-gradient(135deg, ${stops})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55))",
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/* ---------------------------- Style: Outlined --------------------------- */

function OutlinedStyle({
  chunk,
  layout,
  animation,
  preset,
}: StyleChildProps<OutlinedPreset>) {
  const anim = useAnimation(animation)
  const size = useFontSize("outlined", layout.scale)
  const stroke = Math.max(2, Math.round(size * 0.04))
  const letterSpacing = -1
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing,
          lineHeight: 1.02,
          textTransform: "uppercase",
          color: "transparent",
          WebkitTextStroke: `${stroke}px ${preset.stroke}`,
          paintOrder: "stroke fill",
          opacity: anim.opacity,
          transform: anim.transform,
          willChange: "transform, opacity",
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.75))",
        }}
      >
        <TextBox letterSpacing={letterSpacing}>{chunk.text}</TextBox>
      </div>
    </AnchorBox>
  )
}

/** Converts a hex color to rgba with a given alpha. Falls back to the input
 *  color string if it isn't a #rrggbb hex. */
function rgba(color: string, alpha: number) {
  const hex = color.replace("#", "")
  if (hex.length !== 6) return color
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return color
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
