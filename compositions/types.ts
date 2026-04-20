export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type VerticalClipProps = {
  videoSrc: string
  mainCrop: Rect
  webcam: {
    enabled: boolean
    source: Rect
    placement: Rect
    radius: number
  }
  background: string
  durationInFrames?: number
  fps?: number
}

export const OUTPUT_WIDTH = 1080
export const OUTPUT_HEIGHT = 1920
