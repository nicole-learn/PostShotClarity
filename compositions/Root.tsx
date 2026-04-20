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
          mainCrop: { x: 0.28, y: 0, width: 0.44, height: 1 },
          webcam: {
            enabled: false,
            source: { x: 0.05, y: 0.65, width: 0.2, height: 0.3 },
            placement: { x: 0.05, y: 0.72, width: 0.3, height: 0.23 },
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
