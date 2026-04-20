import { NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getRenderProgress } from "@remotion/lambda/client"

import { bucketName, functionName, region, s3 } from "@/lib/remotion-lambda"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const renderId = req.nextUrl.searchParams.get("renderId")
  const outputBucket = req.nextUrl.searchParams.get("bucketName")
  const inputKey = req.nextUrl.searchParams.get("inputKey")

  if (!renderId || !outputBucket) {
    return NextResponse.json(
      { error: "Missing renderId or bucketName" },
      { status: 400 }
    )
  }

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName: outputBucket,
      functionName,
      region,
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
