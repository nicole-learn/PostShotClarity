"use client"

import { getFFmpeg } from "@/lib/ffmpeg"

/**
 * Extracts the audio track from a video File and returns a small mono
 * 16 kHz m4a Blob ready for upload to a speech-to-text API. AAC at 48 kbps
 * keeps a one-hour talking-head clip well under Whisper's 25 MB limit.
 */
export async function extractAudio(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  const buffer = new Uint8Array(await file.arrayBuffer())
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4"
  const input = `audio-in.${ext}`
  const output = "audio-out.m4a"

  await ffmpeg.writeFile(input, buffer)

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)))
  }
  ffmpeg.on("progress", progressHandler)

  try {
    await ffmpeg.exec([
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "aac",
      "-b:a",
      "48k",
      "-y",
      output,
    ])
  } finally {
    ffmpeg.off("progress", progressHandler)
  }

  const data = (await ffmpeg.readFile(output)) as Uint8Array
  const buf = new Uint8Array(data.byteLength)
  buf.set(data)
  return new Blob([buf.buffer as ArrayBuffer], { type: "audio/mp4" })
}
