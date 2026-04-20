export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type VerticalClipProps = {
  videoSrc: string
  /** Natural pixel dimensions of the source video. Required for correct aspect-preserving crops. */
  sourceWidth: number
  sourceHeight: number
  /** Crop in normalized source coords (0-1). */
  mainCrop: Rect
  webcam: {
    enabled: boolean
    /** Webcam region in normalized source coords. */
    source: Rect
    /** Webcam placement in normalized output coords. */
    placement: Rect
    radius: number
  }
  background: string
  durationInFrames?: number
  fps?: number
}

export const OUTPUT_WIDTH = 1080
export const OUTPUT_HEIGHT = 1920
export const OUTPUT_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT

export type PlacedSound = {
  id: string
  url: string
  name: string
  startFrame: number
  durationInFrames: number
  volume: number
}

export type MemeSoundsClipProps = {
  videoSrc: string
  videoWidth: number
  videoHeight: number
  sounds: PlacedSound[]
  durationInFrames: number
  fps: number
}
