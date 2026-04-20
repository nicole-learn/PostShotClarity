import type { Rect } from "./types"

export type CropLayout = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Single source of truth for "how do I place a video element so that the
 * `source` region (in normalized source coords) fills the `box` pixel region,
 * preserving the source's natural aspect ratio".
 *
 * Used by both the Remotion composition (for final render) and the live
 * preview (for WYSIWYG feedback) so the two are guaranteed to match.
 */
export function computeCropLayout({
  sourceWidth,
  sourceHeight,
  source,
  boxWidth,
  boxHeight,
}: {
  sourceWidth: number
  sourceHeight: number
  source: Rect
  boxWidth: number
  boxHeight: number
}): CropLayout {
  const srcRegionPxW = source.width * sourceWidth
  const srcRegionPxH = source.height * sourceHeight
  const scale = Math.min(boxWidth / srcRegionPxW, boxHeight / srcRegionPxH)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const gapX = (boxWidth - srcRegionPxW * scale) / 2
  const gapY = (boxHeight - srcRegionPxH * scale) / 2
  const left = -source.x * sourceWidth * scale + gapX
  const top = -source.y * sourceHeight * scale + gapY
  return { left, top, width, height }
}
