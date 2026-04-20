import { Composition } from "remotion"

import { OUTPUT_HEIGHT, OUTPUT_WIDTH, type VerticalClipProps } from "./types"
import { VerticalClip } from "./VerticalClip"

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
    </>
  )
}
