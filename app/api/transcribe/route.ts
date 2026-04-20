import { NextRequest, NextResponse } from "next/server"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import OpenAI, { toFile } from "openai"

import { bucketName, s3 } from "@/lib/remotion-lambda"
import { enforce, transcribeLimiter } from "@/lib/ratelimit"
import { transcribeBody } from "@/lib/validation"

export const runtime = "nodejs"
export const maxDuration = 120

// OpenAI Whisper accepts <=25MB uploads; refuse anything obviously larger
// before we spend time streaming it out of S3.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  const limited = await enforce(req, transcribeLimiter, "transcribe")
  if (limited) return limited

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server" },
      { status: 500 }
    )
  }

  const raw = (await req.json().catch(() => null)) as unknown
  const parsed = transcribeBody.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const key = parsed.data.key

  const openai = new OpenAI({ apiKey })

  try {
    const head = await s3
      .send(new HeadObjectCommand({ Bucket: bucketName, Key: key }))
      .catch(() => null)
    if (!head) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 })
    }
    if (head.ContentLength && head.ContentLength > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio too large" }, { status: 413 })
    }

    const obj = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key })
    )
    if (!obj.Body) {
      return NextResponse.json(
        { error: "Audio object has no body" },
        { status: 404 }
      )
    }

    // Drain the S3 stream into a single Buffer so we can hand it off as
    // a uploadable File to the OpenAI SDK.
    const chunks: Buffer[] = []
    for await (const chunk of obj.Body as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(
        chunk instanceof Buffer ? chunk : Buffer.from(chunk as Uint8Array)
      )
    }
    const buffer = Buffer.concat(chunks)
    const filename = key.split("/").pop() || "audio.m4a"

    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(buffer, filename),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    })

    return NextResponse.json({
      duration: transcription.duration,
      language: transcription.language,
      text: transcription.text,
      words: transcription.words ?? [],
      segments: (transcription.segments ?? []).map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text,
      })),
    })
  } catch (err) {
    console.error(err)
    const message =
      err instanceof Error ? err.message : "Transcription failed"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // Best-effort cleanup so short-lived audio never lingers in S3.
    s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key })).catch(
      () => {}
    )
  }
}
