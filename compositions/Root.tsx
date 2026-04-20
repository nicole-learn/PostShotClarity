import { Composition } from "remotion"

import {
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  type MemeSoundsClipProps,
  type VerticalClipProps,
} from "./types"
import { MemeSoundsClip } from "./MemeSoundsClip"
import { VerticalClip } from "./VerticalClip"
import { Captions } from "./captions/Captions"
import {
  DEFAULT_CAPTION_FPS,
  DEFAULT_CAPTION_LAYOUT,
  DEFAULT_PRESET_INDEX,
  type CaptionsProps,
} from "./captions/types"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VerticalClip"
        component={VerticalClip}
        durationInFrames={30}
        fps={30}
        width={OUTPUT_WIDTH}
        height={OUTPUT_HEIGHT}
        defaultProps={{
          videoSrc: "",
          sourceWidth: 1920,
          sourceHeight: 1080,
          mainCrop: { x: 0.342, y: 0, width: 0.316, height: 1 },
          webcam: {
            enabled: false,
            source: { x: 0.02, y: 0.65, width: 0.22, height: 0.33 },
            placement: { x: 0.04, y: 0.72, width: 0.32, height: 0.26 },
            radius: 24,
            shape: "rect" as const,
          },
          background: "#000000",
          useOffthread: true,
          durationInFrames: 30,
          fps: 30,
        }}
        calculateMetadata={({ props }: { props: VerticalClipProps }) => ({
          durationInFrames: props.durationInFrames ?? 30,
          fps: props.fps ?? 30,
        })}
      />
      <Composition
        id="MemeSoundsClip"
        component={MemeSoundsClip}
        durationInFrames={30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "",
          videoWidth: 1920,
          videoHeight: 1080,
          sounds: [],
          durationInFrames: 30,
          fps: 30,
        }}
        calculateMetadata={({ props }: { props: MemeSoundsClipProps }) => ({
          durationInFrames: props.durationInFrames ?? 30,
          fps: props.fps ?? 30,
          width: props.videoWidth || 1920,
          height: props.videoHeight || 1080,
        })}
      />
      <Composition
        id="Captions"
        component={Captions}
        durationInFrames={DEFAULT_CAPTION_FPS}
        fps={DEFAULT_CAPTION_FPS}
        width={1280}
        height={720}
        defaultProps={{
          videoSrc: "",
          lines: [],
          style: "clean" as const,
          layout: DEFAULT_CAPTION_LAYOUT,
          animation: "fade" as const,
          presetIndex: DEFAULT_PRESET_INDEX,
          useOffthread: true,
          durationInFrames: DEFAULT_CAPTION_FPS,
          fps: DEFAULT_CAPTION_FPS,
          width: 1280,
          height: 720,
        }}
        calculateMetadata={({ props }: { props: CaptionsProps }) => ({
          durationInFrames:
            props.durationInFrames ?? DEFAULT_CAPTION_FPS,
          fps: props.fps ?? DEFAULT_CAPTION_FPS,
          width: props.width ?? 1280,
          height: props.height ?? 720,
        })}
      />
    </>
  )
}
