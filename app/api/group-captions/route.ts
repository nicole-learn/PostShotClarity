import { NextRequest, NextResponse } from "next/server"

import { captionGroupingLimiter, enforce } from "@/lib/ratelimit"
import { generateSmartCaptionLines } from "@/lib/smart-caption-grouping"
import { captionGroupBody } from "@/lib/validation"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BODY_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  const limited = await enforce(req, captionGroupingLimiter, "group-captions")
  if (limited) return limited

  const contentLength = Number(req.headers.get("content-length") || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Transcript too large" }, { status: 413 })
  }

  const raw = (await req.json().catch(() => null)) as unknown
  const parsed = captionGroupBody.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transcript" }, { status: 400 })
  }

  try {
    const lines = await generateSmartCaptionLines(
      parsed.data.words,
      parsed.data.language
    )
    if (!lines) {
      return NextResponse.json(
        { error: "Smart caption grouping is not configured" },
        { status: 503 }
      )
    }
    return NextResponse.json({ lines })
  } catch (error) {
    console.error("Smart caption grouping failed", error)
    return NextResponse.json(
      { error: "Smart caption grouping failed" },
      { status: 502 }
    )
  }
}
