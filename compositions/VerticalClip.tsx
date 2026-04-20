import { AbsoluteFill, OffthreadVideo, Video } from "remotion"

import type { VerticalClipProps } from "./types"

type Props = VerticalClipProps & { useOffthread?: boolean }

export const VerticalClip: React.FC<Props> = ({
  videoSrc,
  mainCrop,
  webcam,
  background,
  useOffthread = false,
}) => {
  if (!videoSrc) return <AbsoluteFill style={{ background }} />
  const VideoComp = useOffthread ? OffthreadVideo : Video

  return (
    <AbsoluteFill style={{ background }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <VideoComp
          src={videoSrc}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${100 / mainCrop.width}%`,
            height: `${100 / mainCrop.height}%`,
            objectFit: "fill",
            transform: `translate(${-mainCrop.x * 100}%, ${-mainCrop.y * 100}%)`,
            transformOrigin: "0 0",
          }}
        />
      </div>
      {webcam.enabled && (
        <div
          style={{
            position: "absolute",
            left: `${webcam.placement.x * 100}%`,
            top: `${webcam.placement.y * 100}%`,
            width: `${webcam.placement.width * 100}%`,
            height: `${webcam.placement.height * 100}%`,
            overflow: "hidden",
            borderRadius: webcam.radius,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <VideoComp
            src={videoSrc}
            muted
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${100 / webcam.source.width}%`,
              height: `${100 / webcam.source.height}%`,
              objectFit: "fill",
              transform: `translate(${-webcam.source.x * 100}%, ${-webcam.source.y * 100}%)`,
              transformOrigin: "0 0",
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  )
}
