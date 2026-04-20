import { NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getRenderProgress } from "@remotion/lambda/client"

import { bucketName, functionName, region, s3 } from "@/lib/remotion-lambda"
import { enforce, progressLimiter } from "@/lib/ratelimit"
import { anyInputKey, renderId as renderIdSchema } from "@/lib/validation"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const limited = await enforce(req, progressLimiter, "progress")
  if (limited) return limited

  const rawRenderId = req.nextUrl.searchParams.get("renderId")
  const outputBucket = req.nextUrl.searchParams.get("bucketName")
  const rawInputKey = req.nextUrl.searchParams.get("inputKey")

  const renderIdParsed = renderIdSchema.safeParse(rawRenderId)
  if (!renderIdParsed.success) {
    return NextResponse.json({ error: "Invalid renderId" }, { status: 400 })
  }
  if (outputBucket !== bucketName) {
    return NextResponse.json({ error: "Invalid bucketName" }, { status: 400 })
  }

  // inputKey is optional; if present it must match one of our issued key shapes
  // so a caller can't smuggle in an arbitrary S3 key for us to delete.
  let inputKey: string | undefined
  if (rawInputKey) {
    const parsed = anyInputKey.safeParse(rawInputKey)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid inputKey" }, { status: 400 })
    }
    inputKey = parsed.data
  }

  try {
    const progress = await getRenderProgress({
      renderId: renderIdParsed.data,
      bucketName,
      functionName,
      region,
      // Read render state directly from S3 instead of invoking the Lambda
      // every poll — saves a Lambda invocation per 2s poll.
      skipLambdaInvocation: true,
    })

    if (progress.fatalErrorEncountered) {
      if (inputKey) {
        await s3
          .send(new DeleteObjectCommand({ Bucket: bucketName, Key: inputKey }))
          .catch(() => {})
      }
      return NextResponse.json({
        done: true,
        error: progress.errors[0]?.message ?? "Render failed",
      })
    }

    if (progress.done) {
      if (inputKey) {
        await s3
          .send(new DeleteObjectCommand({ Bucket: bucketName, Key: inputKey }))
          .catch(() => {})
      }
      return NextResponse.json({
        done: true,
        outputUrl: progress.outputFile,
        overallProgress: 1,
      })
    }

    return NextResponse.json({
      done: false,
      overallProgress: progress.overallProgress ?? 0,
    })
  } catch (err) {
    console.error(err)
    const message =
      err instanceof Error ? err.message : "Failed to fetch render progress"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
