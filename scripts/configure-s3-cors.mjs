// One-time setup: configure CORS on the Remotion S3 bucket so that browsers
// can PUT upload video inputs and GET the rendered outputs directly.
//
// Usage:  node scripts/configure-s3-cors.mjs
//
// Reads REMOTION_AWS_* from .env / .env.local. Allowed origins come from
// ALLOWED_ORIGINS in the env (comma-separated, e.g.
// "https://postshotclarity.vercel.app,http://localhost:3000"); if missing we
// refuse to apply a wildcard policy.

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")

function loadDotenv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(repoRoot, name)
    if (!existsSync(p)) continue
    const text = readFileSync(p, "utf8")
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq === -1) continue
      const k = line.slice(0, eq).trim()
      let v = line.slice(eq + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!(k in process.env)) process.env[k] = v
    }
  }
}

loadDotenv()

const required = [
  "REMOTION_AWS_ACCESS_KEY_ID",
  "REMOTION_AWS_SECRET_ACCESS_KEY",
  "REMOTION_AWS_REGION",
  "REMOTION_AWS_SERVE_URL",
]
const missing = required.filter((n) => !process.env[n])
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`)
  process.exit(1)
}

const bucketName = new URL(process.env.REMOTION_AWS_SERVE_URL).hostname.split(
  "."
)[0]
const region = process.env.REMOTION_AWS_REGION

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

if (ALLOWED_ORIGINS.length === 0) {
  console.error(
    "ALLOWED_ORIGINS is not set. Example:\n" +
      '  ALLOWED_ORIGINS="https://your-domain.com,http://localhost:3000" npm run setup:cors'
  )
  process.exit(1)
}

if (ALLOWED_ORIGINS.includes("*")) {
  console.error(
    "Refusing to apply a wildcard (*) CORS policy. Set ALLOWED_ORIGINS to explicit origins."
  )
  process.exit(1)
}

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
  },
})

const corsConfig = {
  Bucket: bucketName,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: ALLOWED_ORIGINS,
        AllowedMethods: ["GET", "PUT", "HEAD"],
        AllowedHeaders: ["Content-Type", "Content-Length"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
        MaxAgeSeconds: 3000,
      },
    ],
  },
}

console.log(`Applying CORS to s3://${bucketName} (region ${region})…`)
await s3.send(new PutBucketCorsCommand(corsConfig))

const current = await s3.send(new GetBucketCorsCommand({ Bucket: bucketName }))
console.log("CORS applied:")
console.log(JSON.stringify(current.CORSRules, null, 2))
