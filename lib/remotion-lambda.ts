import { S3Client } from "@aws-sdk/client-s3"
import type { AwsRegion } from "@remotion/lambda/client"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function getRemotionConfig() {
  const region = requireEnv("REMOTION_AWS_REGION") as AwsRegion
  const functionName = requireEnv("REMOTION_AWS_FUNCTION_NAME")
  const serveUrl = requireEnv("REMOTION_AWS_SERVE_URL")
  const accessKeyId = requireEnv("REMOTION_AWS_ACCESS_KEY_ID")
  const secretAccessKey = requireEnv("REMOTION_AWS_SECRET_ACCESS_KEY")

  // Inputs are staged in the same S3 bucket that hosts the deployed site.
  const bucketName = new URL(serveUrl).hostname.split(".")[0]!
  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })

  return { bucketName, functionName, region, s3, serveUrl }
}
