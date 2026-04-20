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

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    key?: string
    props?: Record<string, unknown>
    fileName?: string
  } | null

  if (
    !body ||
    typeof body.key !== "string" ||
    typeof body.props !== "object" ||
    body.props === null
  ) {
    return NextResponse.json(
      { error: "Missing key or props" },
      { status: 400 }
    )
  }

  try {
    const presignedVideoUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: body.key }),
      { expiresIn: 7200 }
    )

    const downloadName = `vertical-${randomUUID()}.mp4`
    const inputProps = {
      ...body.props,
      videoSrc: presignedVideoUrl,
      useOffthread: true,
    }

    const { renderId, bucketName: outputBucket } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "VerticalClip",
      codec: "h264",
      inputProps,
      privacy: "public",
      maxRetries: 1,
      // Cap per-render parallelism. Each render uses at most `concurrency`
      // chunk Lambdas + 1 orchestrator. Keeps us under low account quotas.
      concurrency: 4,
      downloadBehavior: {
        type: "download",
        fileName: downloadName,
      },
    })

    return NextResponse.json({
      renderId,
      bucketName: outputBucket,
      inputKey: body.key,
    })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : "Render failed to start"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
