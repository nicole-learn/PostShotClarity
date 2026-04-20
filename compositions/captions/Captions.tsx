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
  SAFE_ZONE_WIDTH,
  type CaptionLayout,
  type CaptionStyle,
  type CaptionsProps,
} from "./types"

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif'
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const STYLE_BASE_FONT: Record<CaptionStyle, number> = {
  clean: 0.065,
  pop: 0.082,
  karaoke: 0.07,
  neon: 0.074,
  minimal: 0.044,
  impact: 0.094,
  highlight: 0.064,
  typewriter: 0.054,
  bubble: 0.058,
  shadow: 0.086,
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

export const Captions: React.FC<CaptionsProps> = ({
  videoSrc,
  lines,
  style,
  layout,
  useOffthread = false,
}) => {
  const { fps } = useVideoConfig()
  const VideoComp = useOffthread ? OffthreadVideo : Video
  const effective = layout ?? DEFAULT_CAPTION_LAYOUT
  const chunks = React.useMemo(
    () => chunkLines(lines, effective.maxWordsPerLine),
    [lines, effective.maxWordsPerLine]
  )

  return (
    <AbsoluteFill style={{ background: "black" }}>
      {videoSrc ? <VideoComp src={videoSrc} /> : null}
      {chunks.map((chunk) => {
        const from = Math.max(0, Math.round(chunk.start * fps))
        const dur = Math.max(1, Math.round((chunk.end - chunk.start) * fps))
        return (
          <Sequence key={chunk.id} from={from} durationInFrames={dur}>
            <ChunkRouter chunk={chunk} style={style} layout={effective} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

function ChunkRouter({
  chunk,
  style,
  layout,
}: {
  chunk: CaptionChunk
  style: CaptionStyle
  layout: CaptionLayout
}) {
  switch (style) {
    case "pop":
      return <PopStyle chunk={chunk} layout={layout} />
    case "karaoke":
      return <KaraokeStyle chunk={chunk} layout={layout} />
    case "neon":
      return <NeonStyle chunk={chunk} layout={layout} />
    case "minimal":
      return <MinimalStyle chunk={chunk} layout={layout} />
    case "impact":
      return <ImpactStyle chunk={chunk} layout={layout} />
    case "highlight":
      return <HighlightStyle chunk={chunk} layout={layout} />
    case "typewriter":
      return <TypewriterStyle chunk={chunk} layout={layout} />
    case "bubble":
      return <BubbleStyle chunk={chunk} layout={layout} />
    case "shadow":
      return <ShadowStyle chunk={chunk} layout={layout} />
    case "clean":
    default:
      return <CleanStyle chunk={chunk} layout={layout} />
  }
}

function useFontSize(style: CaptionStyle, scale: number) {
  const { height } = useVideoConfig()
  return Math.max(14, Math.round(height * STYLE_BASE_FONT[style] * scale))
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

/* A clean stroke built from `-webkit-text-stroke` + a soft drop-shadow — this
 * looks far sharper at any scale than stacked text-shadow outlines, which
 * visibly smear at big sizes. */
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

/* ----------------------------- Style: Clean ----------------------------- */

function CleanStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const size = useFontSize("clean", layout.scale)
  const enter = easeOutCubic(Math.min(1, frame / 5))
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          color: "#ffffff",
          letterSpacing: -0.3,
          lineHeight: 1.18,
          opacity: enter,
          transform: `translateY(${(1 - enter) * size * 0.14}px)`,
          ...CLEAN_STROKE,
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}

/* ------------------------------ Style: Pop ------------------------------ */

function PopStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("pop", layout.scale)
  const rel = frame / fps + chunk.start
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${size * 0.14}px`,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          textTransform: "uppercase",
          letterSpacing: -0.5,
          lineHeight: 1.05,
        }}
      >
        {chunk.words.map((w, i) => {
          const entryF = Math.round((w.start - chunk.start) * fps)
          const s = spring({
            fps,
            frame: frame - entryF,
            config: { damping: 12, stiffness: 260, mass: 0.5 },
          })
          const active = rel >= w.start && rel < w.end
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `scale(${interpolate(s, [0, 1], [0.55, 1])})`,
                opacity: Math.max(0, Math.min(1, s * 1.2)),
                color: active ? "#ffe34d" : "#ffffff",
                transition: "color 70ms linear",
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
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("karaoke", layout.scale)
  const rel = frame / fps + chunk.start
  const enter = easeOutCubic(Math.min(1, frame / 5))
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
          letterSpacing: -0.3,
          lineHeight: 1.15,
          opacity: enter,
        }}
      >
        {chunk.words.map((w, i) => {
          const t = interpolate(
            rel,
            [w.start, Math.min(w.end, w.start + 0.14)],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
          const color =
            t >= 1
              ? "#ffffff"
              : t > 0
                ? "#4ae2d6"
                : "rgba(255,255,255,0.48)"
          return (
            <span
              key={i}
              style={{
                color,
                transition: "color 90ms linear",
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
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("neon", layout.scale)
  const s = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 200, mass: 0.7 },
  })
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: 2,
          lineHeight: 1.15,
          textTransform: "uppercase",
          color: "#fdf0ff",
          transform: `scale(${interpolate(s, [0, 1], [0.92, 1])})`,
          opacity: easeOutCubic(Math.min(1, frame / 4)),
          textShadow:
            "0 0 3px #ff4fe0, 0 0 10px #ff2dd4, 0 0 22px #ff2dd4, 0 0 48px rgba(255,45,212,0.65)",
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}

/* ---------------------------- Style: Minimal ---------------------------- */

function MinimalStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const size = useFontSize("minimal", layout.scale)
  const enter = easeOutCubic(Math.min(1, frame / 4))
  return (
    <AnchorBox layout={layout} fullWidth={false}>
      <div
        style={{
          background: "rgba(0,0,0,0.58)",
          color: "#ffffff",
          padding: `${size * 0.28}px ${size * 0.68}px`,
          borderRadius: size * 0.22,
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: size,
          letterSpacing: 0.15,
          lineHeight: 1.32,
          opacity: enter,
          maxWidth: `${SAFE_ZONE_WIDTH * 100}%`,
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}

/* ----------------------------- Style: Impact ---------------------------- */

function ImpactStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("impact", layout.scale)
  const s = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 300, mass: 0.45 },
  })
  const scale = interpolate(s, [0, 1], [1.08, 1])
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing: -1.5,
          lineHeight: 1,
          textTransform: "uppercase",
          color: "#ffffff",
          transform: `scale(${scale})`,
          opacity: Math.max(0, Math.min(1, s * 1.3)),
          WebkitTextStroke: `${Math.max(2, Math.round(size * 0.05))}px #000`,
          paintOrder: "stroke fill",
          textShadow: "0 6px 16px rgba(0,0,0,0.55)",
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}

/* --------------------------- Style: Highlight --------------------------- */

function HighlightStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("highlight", layout.scale)
  const rel = frame / fps + chunk.start
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${size * 0.18}px ${size * 0.26}px`,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.25,
          letterSpacing: -0.2,
        }}
      >
        {chunk.words.map((w, i) => {
          const wipe = interpolate(
            rel,
            [w.start, Math.min(w.end, w.start + 0.12)],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
          const painted = wipe > 0.02
          return (
            <span
              key={i}
              style={{
                position: "relative",
                display: "inline-block",
                color: painted ? "#0b0b0b" : "#ffffff",
                padding: `${size * 0.04}px ${size * 0.22}px`,
                textShadow: painted ? "none" : "0 2px 6px rgba(0,0,0,0.8)",
                WebkitTextStroke: painted ? "0" : "1px rgba(0,0,0,0.9)",
                paintOrder: "stroke fill",
                transition: "color 110ms linear",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffe94d",
                  transformOrigin: "left center",
                  transform: `scaleX(${wipe})`,
                  borderRadius: size * 0.12,
                  zIndex: -1,
                  boxShadow: "0 2px 6px rgba(255,213,0,0.25)",
                }}
              />
              {w.word}
            </span>
          )
        })}
      </div>
    </AnchorBox>
  )
}

/* -------------------------- Style: Typewriter -------------------------- */

function TypewriterStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("typewriter", layout.scale)
  const totalChars = chunk.text.length
  const totalFrames = Math.max(
    1,
    Math.round((chunk.end - chunk.start) * fps)
  )
  const revealFrames = Math.min(
    Math.max(8, totalFrames - 4),
    Math.max(10, totalChars * 1.2)
  )
  const charsShown = Math.floor(
    interpolate(frame, [0, revealFrames], [0, totalChars], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  )
  const cursorOn = Math.floor(frame / 8) % 2 === 0
  return (
    <AnchorBox layout={layout} fullWidth={false}>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: size,
          color: "#ffffff",
          letterSpacing: 0,
          lineHeight: 1.35,
          maxWidth: `${SAFE_ZONE_WIDTH * 100}%`,
          padding: `${size * 0.22}px ${size * 0.5}px`,
          background: "rgba(0,0,0,0.55)",
          borderRadius: size * 0.18,
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          whiteSpace: "pre-wrap",
        }}
      >
        {chunk.text.slice(0, charsShown)}
        <span
          style={{
            display: "inline-block",
            width: Math.max(2, size * 0.08),
            height: size * 0.95,
            verticalAlign: "-0.15em",
            marginLeft: size * 0.08,
            background: "#ffffff",
            opacity: cursorOn ? 1 : 0,
          }}
        />
      </div>
    </AnchorBox>
  )
}

/* ----------------------------- Style: Bubble ---------------------------- */

function BubbleStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("bubble", layout.scale)
  const s = spring({
    fps,
    frame,
    config: { damping: 13, stiffness: 220, mass: 0.55 },
  })
  const scale = interpolate(s, [0, 1], [0.88, 1])
  return (
    <AnchorBox layout={layout} fullWidth={false}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,244,246,0.96) 100%)",
          color: "#111",
          padding: `${size * 0.34}px ${size * 0.9}px`,
          borderRadius: size * 1.2,
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: -0.2,
          lineHeight: 1.25,
          opacity: easeOutQuint(Math.min(1, s)),
          transform: `scale(${scale})`,
          maxWidth: `${SAFE_ZONE_WIDTH * 100}%`,
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18)",
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}

/* ----------------------------- Style: Shadow ---------------------------- */

function ShadowStyle({
  chunk,
  layout,
}: {
  chunk: CaptionChunk
  layout: CaptionLayout
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const size = useFontSize("shadow", layout.scale)
  const s = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 240, mass: 0.55 },
  })
  const slide = interpolate(s, [0, 1], [size * 0.18, 0])
  const offset = Math.max(3, Math.round(size * 0.05))
  return (
    <AnchorBox layout={layout}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          letterSpacing: -1.2,
          lineHeight: 1.02,
          textTransform: "uppercase",
          color: "#ffffff",
          transform: `translate(${slide}px, ${slide * 0.6}px)`,
          opacity: easeOutCubic(Math.min(1, frame / 5)),
          WebkitTextStroke: "1.5px #0a0a0a",
          paintOrder: "stroke fill",
          textShadow: `${offset}px ${offset}px 0 #ff5c79, ${offset * 2 + 2}px ${offset * 2 + 2}px 14px rgba(0,0,0,0.4)`,
        }}
      >
        {chunk.text}
      </div>
    </AnchorBox>
  )
}
