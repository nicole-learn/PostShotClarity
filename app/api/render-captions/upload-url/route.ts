import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { bucketName, s3 } from "@/lib/remotion-lambda"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    fileName?: string
    contentType?: string
    prefix?: "audio" | "video"
  } | null

  if (!body || typeof body.fileName !== "string") {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
  }

  const ext = (body.fileName.split(".").pop() ?? "bin").toLowerCase()
  const prefix = body.prefix === "audio" ? "captions-audio" : "inputs"
  const key = `${prefix}/${randomUUID()}.${ext}`
  const contentType = body.contentType || "application/octet-stream"

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  )

  return NextResponse.json({ uploadUrl, key, contentType })
}
