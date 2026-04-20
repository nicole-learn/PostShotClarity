import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { renderMediaOnLambda } from "@remotion/lambda/client"

import {
  bucketName,
  functionName,
  region,
  s3,
  serveUrl,
} from "@/lib/remotion-lambda"
import { enforce, renderLimiter } from "@/lib/ratelimit"
import { renderBody } from "@/lib/validation"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_BODY_BYTES = 256 * 1024

export async function POST(req: NextRequest) {
  const limited = await enforce(req, renderLimiter, "render-meme-sounds")
  if (limited) return limited

  const lenHeader = req.headers.get("content-length")
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  const raw = (await req.json().catch(() => null)) as unknown
  const parsed = renderBody.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  try {
    const presignedVideoUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: parsed.data.key }),
      { expiresIn: 900 }
    )

    const downloadName = `meme-sounds-${randomUUID()}.mp4`
    const inputProps = {
      ...parsed.data.props,
      videoSrc: presignedVideoUrl,
      useOffthread: true,
    }

    const { renderId, bucketName: outputBucket } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "MemeSoundsClip",
      codec: "h264",
      inputProps,
      privacy: "public",
      maxRetries: 1,
      concurrency: 4,
      downloadBehavior: {
        type: "download",
        fileName: downloadName,
      },
    })

    return NextResponse.json({
      renderId,
      bucketName: outputBucket,
      inputKey: parsed.data.key,
    })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : "Render failed to start"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
