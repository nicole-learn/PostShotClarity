import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { bucketName, s3 } from "@/lib/remotion-lambda"
import { enforce, uploadUrlLimiter } from "@/lib/ratelimit"
import {
  VIDEO_CONTENT_TYPE,
  VIDEO_EXTS,
  extOf,
  uploadUrlBody,
} from "@/lib/validation"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const limited = await enforce(req, uploadUrlLimiter, "upload-url")
  if (limited) return limited

  const raw = (await req.json().catch(() => null)) as unknown
  const parsed = uploadUrlBody.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const ext = extOf(parsed.data.fileName)
  if (!(VIDEO_EXTS as readonly string[]).includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type: .${ext || "?"}` },
      { status: 400 }
    )
  }

  const contentType = VIDEO_CONTENT_TYPE[ext]!
  const key = `inputs/${randomUUID()}.${ext}`

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 900 }
  )

  return NextResponse.json({ uploadUrl, key, contentType })
}
