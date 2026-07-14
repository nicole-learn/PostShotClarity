import {
  DEFAULT_CAPTION_FPS,
  type CaptionAnimation,
  type CaptionLayout,
  type CaptionLine,
  type CaptionPresetIndex,
  type CaptionStyle,
  type CaptionsProps,
} from "./types.ts"

export type CaptionsCompositionSpec = {
  inputProps: CaptionsProps
  durationInFrames: number
  fps: number
  width: number
  height: number
}

type CreateCaptionsCompositionSpecArgs = {
  videoSrc: string
  lines: CaptionLine[]
  style: CaptionStyle
  layout: CaptionLayout
  animation: CaptionAnimation
  presetIndex: CaptionPresetIndex
  durationSeconds: number
  width: number
  height: number
  fps?: number
}

function evenDimension(value: number, fallback: number) {
  const safe = Number.isFinite(value) && value > 0 ? value : fallback
  return Math.max(2, Math.round(safe / 2) * 2)
}

/**
 * The single source of truth for both the Remotion Player and Lambda render.
 * Keeping the visual props and composition metadata together prevents the
 * preview and export paths from silently drifting as editor features evolve.
 */
export function createCaptionsCompositionSpec({
  videoSrc,
  lines,
  style,
  layout,
  animation,
  presetIndex,
  durationSeconds,
  width,
  height,
  fps = DEFAULT_CAPTION_FPS,
}: CreateCaptionsCompositionSpecArgs): CaptionsCompositionSpec {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_CAPTION_FPS
  const lastCaptionEnd = lines.reduce(
    (latest, line) => Math.max(latest, line.end),
    0
  )
  const safeDuration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : Math.max(lastCaptionEnd, 1)

  return {
    inputProps: {
      videoSrc,
      lines,
      style,
      layout,
      animation,
      presetIndex,
    },
    durationInFrames: Math.max(safeFps, Math.ceil(safeDuration * safeFps)),
    fps: safeFps,
    width: evenDimension(width, 1280),
    height: evenDimension(height, 720),
  }
}

/**
 * Lambda receives the exact Player props plus the metadata that Remotion's
 * calculateMetadata() needs. The API may only replace the video URL and video
 * decoding implementation; all caption visuals stay byte-for-byte identical.
 */
export function captionsRenderProps(
  spec: CaptionsCompositionSpec
): CaptionsProps {
  return {
    ...spec.inputProps,
    durationInFrames: spec.durationInFrames,
    fps: spec.fps,
    width: spec.width,
    height: spec.height,
  }
}

/** The only intentional Player/Lambda differences are the accessible video
 * source and the deterministic server-side decoder. */
export function captionsLambdaInputProps<T extends object>(
  props: T,
  videoSrc: string
): T & Pick<CaptionsProps, "videoSrc" | "useOffthread"> {
  return {
    ...props,
    videoSrc,
    useOffthread: true,
  }
}
