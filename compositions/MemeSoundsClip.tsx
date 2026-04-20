import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
  Video,
} from "remotion"

import type { MemeSoundsClipProps } from "./types"

type Props = MemeSoundsClipProps & { useOffthread?: boolean }

function resolveSoundSrc(src: string): string {
  if (/^https?:\/\//i.test(src)) return src
  return staticFile(src.startsWith("/") ? src.slice(1) : src)
}

export const MemeSoundsClip: React.FC<Props> = ({
  videoSrc,
  videoWidth,
  videoHeight,
  sounds,
  useOffthread = false,
}) => {
  const { width: outW, height: outH } = useVideoConfig()
  const VideoComp = useOffthread ? OffthreadVideo : Video

  if (!videoSrc || !videoWidth || !videoHeight) {
    return <AbsoluteFill style={{ background: "#000" }} />
  }

  const scale = Math.min(outW / videoWidth, outH / videoHeight)
  const drawW = videoWidth * scale
  const drawH = videoHeight * scale
  const left = (outW - drawW) / 2
  const top = (outH - drawH) / 2

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <VideoComp
        src={videoSrc}
        style={{
          position: "absolute",
          left,
          top,
          width: drawW,
          height: drawH,
        }}
      />
      {sounds.map((s) => (
        <Sequence
          key={s.id}
          from={Math.max(0, Math.round(s.startFrame))}
          durationInFrames={Math.max(1, Math.round(s.durationInFrames))}
        >
          <Audio src={resolveSoundSrc(s.url)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
