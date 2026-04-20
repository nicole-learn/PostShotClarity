import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  getRenderProgress,
  renderMediaOnLambda,
  type AwsRegion,
} from "@remotion/lambda/client"

export const runtime = "nodejs"
export const maxDuration = 300

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const region = requireEnv("REMOTION_AWS_REGION") as AwsRegion
const functionName = requireEnv("REMOTION_AWS_FUNCTION_NAME")
const serveUrl = requireEnv("REMOTION_AWS_SERVE_URL")
const accessKeyId = requireEnv("REMOTION_AWS_ACCESS_KEY_ID")
const secretAccessKey = requireEnv("REMOTION_AWS_SECRET_ACCESS_KEY")

// The serve URL is hosted on the same Remotion-managed bucket we'll use to
// stage input uploads (e.g. remotionlambda-useast1-xxxx.s3.us-east-1.amazonaws.com/...).
const bucketName = new URL(serveUrl).hostname.split(".")[0]

const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
})

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file")
  const propsRaw = form.get("props")

  if (!(file instanceof File) || typeof propsRaw !== "string") {
    return NextResponse.json(
      { error: "Missing file or props" },
      { status: 400 }
    )
  }

  const id = randomUUID()
  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase()
  const inputKey = `inputs/${id}.${ext}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: inputKey,
      Body: bytes,
      ContentType: file.type || "video/mp4",
    })
  )

  try {
    const presignedVideoUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: inputKey }),
      { expiresIn: 3600 }
    )

    const props = JSON.parse(propsRaw)
    const inputProps = {
      ...props,
      videoSrc: presignedVideoUrl,
      useOffthread: true,
    }

    const { renderId, bucketName: outputBucket } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl: serveUrl!,
      composition: "VerticalClip",
      codec: "h264",
      inputProps,
      privacy: "public",
      maxRetries: 1,
      downloadBehavior: {
        type: "download",
        fileName: `vertical-${id}.mp4`,
      },
    })

    while (true) {
      const progress = await getRenderProgress({
        renderId,
        bucketName: outputBucket,
        functionName,
        region,
      })
      if (progress.fatalErrorEncountered) {
        const msg = progress.errors[0]?.message ?? "Render failed"
        throw new Error(msg)
      }
      if (progress.done) {
        if (!progress.outputFile) {
          throw new Error("Render finished but produced no output file")
        }
        const res = await fetch(progress.outputFile)
        if (!res.ok || !res.body) {
          throw new Error(`Failed to fetch rendered output: ${res.status}`)
        }
        return new NextResponse(res.body, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="vertical-${id}.mp4"`,
          },
        })
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : "Render failed"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await s3
      .send(new DeleteObjectCommand({ Bucket: bucketName, Key: inputKey }))
      .catch(() => {})
  }
}
