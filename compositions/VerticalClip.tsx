import { AbsoluteFill, OffthreadVideo, useVideoConfig, Video } from "remotion"

import { computeCropLayout } from "./layout"
import type { Rect, VerticalClipProps } from "./types"

type Props = VerticalClipProps & { useOffthread?: boolean }

type VideoComponent = typeof Video | typeof OffthreadVideo

function CroppedSourceLayer({
  videoSrc,
  sourceWidth,
  sourceHeight,
  source,
  boxWidth,
  boxHeight,
  VideoComp,
  muted,
}: {
  videoSrc: string
  sourceWidth: number
  sourceHeight: number
  source: Rect
  boxWidth: number
  boxHeight: number
  VideoComp: VideoComponent
  muted?: boolean
}) {
  const { left, top, width, height } = computeCropLayout({
    sourceWidth,
    sourceHeight,
    source,
    boxWidth,
    boxHeight,
  })

  return (
    <VideoComp
      src={videoSrc}
      muted={muted}
      style={{ position: "absolute", left, top, width, height }}
    />
  )
}

export const VerticalClip: React.FC<Props> = ({
  videoSrc,
  sourceWidth,
  sourceHeight,
  mainCrop,
  webcam,
  background,
  useOffthread = false,
}) => {
  const { width: outW, height: outH } = useVideoConfig()
  const VideoComp: VideoComponent = useOffthread ? OffthreadVideo : Video

  if (!videoSrc || !sourceWidth || !sourceHeight) {
    return <AbsoluteFill style={{ background }} />
  }

  const placement = {
    x: webcam.placement.x * outW,
    y: webcam.placement.y * outH,
    width: webcam.placement.width * outW,
    height: webcam.placement.height * outH,
  }

  return (
    <AbsoluteFill style={{ background }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <CroppedSourceLayer
          videoSrc={videoSrc}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
          source={mainCrop}
          boxWidth={outW}
          boxHeight={outH}
          VideoComp={VideoComp}
        />
      </div>
      {webcam.enabled && (
        <div
          style={{
            position: "absolute",
            left: placement.x,
            top: placement.y,
            width: placement.width,
            height: placement.height,
            overflow: "hidden",
            borderRadius:
              webcam.shape === "circle"
                ? "50%"
                : webcam.radius,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <CroppedSourceLayer
            videoSrc={videoSrc}
            sourceWidth={sourceWidth}
            sourceHeight={sourceHeight}
            source={webcam.source}
            boxWidth={placement.width}
            boxHeight={placement.height}
            VideoComp={VideoComp}
            muted
          />
        </div>
      )}
    </AbsoluteFill>
  )
}
