"use client"

import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

let instance: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

export function getFFmpeg() {
  if (instance) return Promise.resolve(instance)
  if (loading) return loading

  loading = (async () => {
    const ffmpeg = new FFmpeg()
    const base = "/ffmpeg"
    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript")
    const wasmURL = await toBlobURL(
      `${base}/ffmpeg-core.wasm`,
      "application/wasm"
    )
    await ffmpeg.load({ coreURL, wasmURL })
    instance = ffmpeg
    return ffmpeg
  })()

  return loading
}
