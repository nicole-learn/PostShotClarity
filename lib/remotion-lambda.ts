import { S3Client } from "@aws-sdk/client-s3"
import type { AwsRegion } from "@remotion/lambda/client"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const region = requireEnv("REMOTION_AWS_REGION") as AwsRegion
export const functionName = requireEnv("REMOTION_AWS_FUNCTION_NAME")
export const serveUrl = requireEnv("REMOTION_AWS_SERVE_URL")

const accessKeyId = requireEnv("REMOTION_AWS_ACCESS_KEY_ID")
const secretAccessKey = requireEnv("REMOTION_AWS_SECRET_ACCESS_KEY")

// Inputs are staged in the same S3 bucket that hosts the deployed site.
export const bucketName = new URL(serveUrl).hostname.split(".")[0]

export const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
})
