import { NextRequest, NextResponse } from "next/server"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

export const runtime = "nodejs"
export const maxDuration = 300

type CachedBundle = { location: string }
let cachedBundle: Promise<CachedBundle> | null = null

async function getBundle(): Promise<CachedBundle> {
  if (cachedBundle) return cachedBundle
  cachedBundle = (async () => {
    const { bundle } = await import("@remotion/bundler")
    const location = await bundle({
      entryPoint: path.join(process.cwd(), "compositions", "index.ts"),
      publicDir: path.join(process.cwd(), "public"),
    })
    return { location }
  })()
  return cachedBundle
}

export async function POST(req: NextRequest) {
  const tmpDir = path.join(process.cwd(), "public", "tmp")
  const id = randomUUID()
  let inputFile: string | null = null
  let outputFile: string | null = null

  try {
    await mkdir(tmpDir, { recursive: true })

    const form = await req.formData()
    const file = form.get("file")
    const propsRaw = form.get("props")

    if (!(file instanceof File) || typeof propsRaw !== "string") {
      return NextResponse.json(
        { error: "Missing file or props" },
        { status: 400 }
      )
    }

    const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase()
    const inputName = `${id}.${ext}`
    inputFile = path.join(tmpDir, inputName)
    outputFile = path.join(tmpDir, `${id}.mp4`)

    const bytes = new Uint8Array(await file.arrayBuffer())
    await writeFile(inputFile, bytes)

    const props = JSON.parse(propsRaw)
    const origin = req.nextUrl.origin
    const inputProps = {
      ...props,
      videoSrc: `${origin}/tmp/${inputName}`,
      useOffthread: true,
    }

    const { location } = await getBundle()
    const { selectComposition, renderMedia } = await import(
      "@remotion/renderer"
    )

    const composition = await selectComposition({
      serveUrl: location,
      id: "VerticalClip",
      inputProps,
    })

    await renderMedia({
      composition,
      serveUrl: location,
      codec: "h264",
      outputLocation: outputFile,
      inputProps,
    })

    const buf = await readFile(outputFile)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="vertical-${id}.mp4"`,
      },
    })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : "Render failed"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (inputFile) {
      await rm(inputFile, { force: true }).catch(() => {})
    }
    if (outputFile) {
      await rm(outputFile, { force: true }).catch(() => {})
    }
  }
}
