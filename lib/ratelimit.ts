import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Upstash credentials are auto-provisioned by the Vercel integration. The
// legacy names (KV_REST_API_*) and the newer ones (UPSTASH_REDIS_REST_*)
// both appear in the wild depending on when the integration was set up, so
// accept either. If neither is set (e.g. local dev without redis), fall back
// to a no-op limiter so the app still runs — production must have them.
const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

function make(tokens: number, window: `${number} s` | `${number} m`) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: "psc",
  })
}

// Expensive ops — each Lambda render costs real money and consumes quota.
export const renderLimiter = make(5, "1 m")
// OpenAI Whisper billed per-minute of audio; keep very tight.
export const transcribeLimiter = make(5, "1 m")
// Upload URL issuance is cheap but lets callers fill the bucket.
export const uploadUrlLimiter = make(30, "1 m")
// Progress is polled every ~2s from the client, needs a higher ceiling.
export const progressLimiter = make(120, "1 m")

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return "anon"
}

export async function enforce(
  req: NextRequest,
  limiter: Ratelimit | null,
  bucket: string
): Promise<NextResponse | null> {
  if (!limiter) return null
  const ip = clientIp(req)
  const { success, limit, remaining, reset } = await limiter.limit(
    `${bucket}:${ip}`
  )
  if (success) return null
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
      },
    }
  )
}
