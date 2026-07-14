import assert from "node:assert/strict"
import test from "node:test"

import { chunkLines } from "./chunk.ts"
import {
  captionsLambdaInputProps,
  captionsRenderProps,
  createCaptionsCompositionSpec,
} from "./render-spec.ts"
import {
  DEFAULT_CAPTION_LAYOUT,
  DEFAULT_PRESET_INDEX,
  type CaptionLine,
} from "./types.ts"

test("preview and export use the same edited caption state", () => {
  const lines: CaptionLine[] = [
    {
      id: "edited",
      text: "This is exactly what ships",
      start: 1.25,
      end: 3.75,
      words: [
        { word: "this", start: 1.25, end: 1.7 },
        { word: "ships", start: 1.7, end: 3.75 },
      ],
    },
  ]
  const layout = {
    ...DEFAULT_CAPTION_LAYOUT,
    x: 0.41,
    y: 0.73,
    scale: 1.35,
    maxCharsPerLine: 12,
  }
  const presetIndex = { ...DEFAULT_PRESET_INDEX, pop: 3 }
  const spec = createCaptionsCompositionSpec({
    videoSrc: "blob:preview-video",
    lines,
    style: "pop",
    layout,
    animation: "slide",
    presetIndex,
    durationSeconds: 4.01,
    width: 1919,
    height: 1079,
  })

  // Match the JSON boundary used by fetch() so references cannot hide drift.
  const exported = JSON.parse(
    JSON.stringify(captionsRenderProps(spec))
  ) as ReturnType<typeof captionsRenderProps>

  assert.deepEqual(
    {
      lines: exported.lines,
      style: exported.style,
      layout: exported.layout,
      animation: exported.animation,
      presetIndex: exported.presetIndex,
    },
    {
      lines: spec.inputProps.lines,
      style: spec.inputProps.style,
      layout: spec.inputProps.layout,
      animation: spec.inputProps.animation,
      presetIndex: spec.inputProps.presetIndex,
    }
  )
  assert.deepEqual(
    chunkLines(exported.lines, exported.layout?.maxCharsPerLine ?? 0),
    chunkLines(
      spec.inputProps.lines,
      spec.inputProps.layout?.maxCharsPerLine ?? 0
    )
  )
  assert.equal(exported.lines[0].text, "This is exactly what ships")
  assert.equal(exported.width, spec.width)
  assert.equal(exported.height, spec.height)
  assert.equal(exported.durationInFrames, spec.durationInFrames)
  assert.equal(spec.width % 2, 0)
  assert.equal(spec.height % 2, 0)

  const lambdaProps = captionsLambdaInputProps(
    exported,
    "https://signed.example/video.mp4"
  )
  assert.deepEqual(
    { ...lambdaProps, videoSrc: exported.videoSrc, useOffthread: undefined },
    { ...exported, useOffthread: undefined }
  )
  assert.equal(lambdaProps.videoSrc, "https://signed.example/video.mp4")
  assert.equal(lambdaProps.useOffthread, true)
})

test("preview metadata and export metadata share the same fallbacks", () => {
  const spec = createCaptionsCompositionSpec({
    videoSrc: "blob:preview-video",
    lines: [
      {
        id: "fallback",
        text: "Fallback duration",
        start: 2,
        end: 5.1,
        words: [],
      },
    ],
    style: "clean",
    layout: DEFAULT_CAPTION_LAYOUT,
    animation: "none",
    presetIndex: DEFAULT_PRESET_INDEX,
    durationSeconds: 0,
    width: 0,
    height: 0,
  })

  assert.equal(spec.durationInFrames, 153)
  assert.equal(spec.width, 1280)
  assert.equal(spec.height, 720)
})
