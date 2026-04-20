"use client"

import * as React from "react"
import JSZip from "jszip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  ImageUpload01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { AnimatedNumber } from "@/components/animated-number"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { cn } from "@/lib/utils"

type Preset = {
  size: number
  label: string
  platform: string
}

const PRESETS: Preset[] = [
  { size: 28, label: "28 × 28", platform: "Twitch · small" },
  { size: 56, label: "56 × 56", platform: "Twitch · medium" },
  { size: 112, label: "112 × 112", platform: "Twitch · large" },
  { size: 32, label: "32 × 32", platform: "7TV · small" },
  { size: 64, label: "64 × 64", platform: "7TV · medium" },
  { size: 128, label: "128 × 128", platform: "Discord · 7TV" },
]

type Rendered = { preset: Preset; dataUrl: string; blob: Blob }

async function renderSize(
  source: HTMLImageElement,
  size: number
): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not available")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const scale = Math.min(size / source.width, size / source.height)
  const w = source.width * scale
  const h = source.height * scale
  ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      "image/png"
    )
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function EmotesFormatter() {
  const [source, setSource] = React.useState<{ file: File; url: string } | null>(
    null
  )
  const [rendered, setRendered] = React.useState<Rendered[]>([])
  const [working, setWorking] = React.useState(false)
  const { push } = useToast()

  const handleFile = React.useCallback(
    async (file: File) => {
      setWorking(true)
      try {
        const img = await loadImage(file)
        const url = img.src
        const results = await Promise.all(
          PRESETS.map(async (preset) => {
            const blob = await renderSize(img, preset.size)
            const dataUrl = URL.createObjectURL(blob)
            return { preset, dataUrl, blob }
          })
        )
        setSource({ file, url })
        setRendered(results)
        pushRecent({ tool: "emotes", name: file.name, size: file.size })
      } catch {
        push({ message: "That image couldn't be read", variant: "error" })
      } finally {
        setWorking(false)
      }
    },
    [push]
  )

  const reset = () => {
    rendered.forEach((r) => URL.revokeObjectURL(r.dataUrl))
    if (source) URL.revokeObjectURL(source.url)
    setSource(null)
    setRendered([])
  }

  const downloadAll = async () => {
    const zip = new JSZip()
    const baseName = source?.file.name.replace(/\.[^.]+$/, "") || "emote"
    rendered.forEach(({ preset, blob }) => {
      zip.file(`${baseName}-${preset.size}.png`, blob)
    })
    const out = await zip.generateAsync({ type: "blob" })
    downloadBlob(out, `${baseName}-emotes.zip`)
    push({ message: "Emote pack downloaded", variant: "success" })
  }

  if (!source) {
    return (
      <div className="h-full p-4 md:p-6">
        <Dropzone
          onFile={handleFile}
          accept="image/*"
          icon={ImageUpload01Icon}
          label="Drop an image to format"
          hint="PNG or JPG · best with a transparent background"
        />
      </div>
    )
  }

  const totalKb = rendered.reduce((acc, r) => acc + r.blob.size, 0) / 1024

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-6 md:p-6">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-[image:repeating-linear-gradient(45deg,transparent_0_6px,color-mix(in_oklch,var(--muted)_50%,transparent)_6px_12px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.url}
            alt=""
            className="max-h-full max-w-full object-contain p-6"
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {source.file.name}
            <span className="mx-2 text-muted-foreground/50">·</span>
            <span className="tnum">
              <AnimatedNumber value={totalKb} decimals={0} /> KB total
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            <HugeiconsIcon icon={Refresh01Icon} />
            Replace
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3">
          {rendered.map(({ preset, dataUrl, blob }) => (
            <button
              type="button"
              key={preset.size}
              onClick={() =>
                downloadBlob(
                  blob,
                  `${source.file.name.replace(/\.[^.]+$/, "")}-${preset.size}.png`
                )
              }
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-e2"
              )}
            >
              <div className="relative flex flex-1 items-center justify-center bg-[image:repeating-linear-gradient(45deg,transparent_0_6px,color-mix(in_oklch,var(--muted)_50%,transparent)_6px_12px)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={preset.label}
                  width={preset.size}
                  height={preset.size}
                  style={{ width: preset.size, height: preset.size }}
                  className="pointer-events-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium tnum">
                    {preset.label}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {preset.platform}
                  </div>
                </div>
                <HugeiconsIcon
                  icon={Download01Icon}
                  size={14}
                  strokeWidth={1.75}
                  className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button size="lg" onClick={downloadAll} disabled={working}>
            <HugeiconsIcon icon={Download01Icon} />
            Download all · .zip
          </Button>
        </div>
      </div>
    </div>
  )
}
