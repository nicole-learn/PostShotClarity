"use client"

import * as React from "react"
import { Player } from "@remotion/player"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CameraVideoIcon,
  Download01Icon,
  Refresh01Icon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { RectOverlay } from "@/components/rect-overlay"
import { cn } from "@/lib/utils"
import { VerticalClip } from "@/compositions/VerticalClip"
import {
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  type Rect,
  type VerticalClipProps,
} from "@/compositions/types"

const OUTPUT_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT
const FPS = 30

type VideoMeta = {
  file: File
  url: string
  duration: number
  width: number
  height: number
}

function loadVideo(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      resolve({
        file,
        url,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }
    video.onerror = () => reject(new Error("Could not read video"))
    video.src = url
  })
}

function defaultMainCrop(sourceAspect: number): Rect {
  const width = Math.min(1, OUTPUT_ASPECT / sourceAspect)
  return {
    x: (1 - width) / 2,
    y: 0,
    width,
    height: 1,
  }
}

export function VerticalEditor() {
  const [video, setVideo] = React.useState<VideoMeta | null>(null)
  const [mainCrop, setMainCrop] = React.useState<Rect>({
    x: 0.28,
    y: 0,
    width: 0.44,
    height: 1,
  })
  const [webcamEnabled, setWebcamEnabled] = React.useState(false)
  const [webcamSource, setWebcamSource] = React.useState<Rect>({
    x: 0.05,
    y: 0.6,
    width: 0.22,
    height: 0.35,
  })
  const [webcamPlacement, setWebcamPlacement] = React.useState<Rect>({
    x: 0.05,
    y: 0.72,
    width: 0.3,
    height: 0.23,
  })
  const [exporting, setExporting] = React.useState(false)
  const [exportProgress, setExportProgress] = React.useState<string | null>(null)

  const sourceAspect = video ? video.width / video.height : 16 / 9

  const handleUpload = async (file: File) => {
    const meta = await loadVideo(file)
    setVideo(meta)
    setMainCrop(defaultMainCrop(meta.width / meta.height))
  }

  const reset = () => {
    if (video) URL.revokeObjectURL(video.url)
    setVideo(null)
    setWebcamEnabled(false)
    setExportProgress(null)
  }

  const durationInFrames = video
    ? Math.max(1, Math.floor(video.duration * FPS))
    : FPS

  const inputProps: VerticalClipProps & { useOffthread: boolean } = React.useMemo(
    () => ({
      videoSrc: video?.url ?? "",
      mainCrop,
      webcam: {
        enabled: webcamEnabled,
        source: webcamSource,
        placement: webcamPlacement,
        radius: 24,
      },
      background: "#000000",
      durationInFrames,
      fps: FPS,
      useOffthread: false,
    }),
    [
      video?.url,
      mainCrop,
      webcamEnabled,
      webcamSource,
      webcamPlacement,
      durationInFrames,
    ]
  )

  const handleExport = async () => {
    if (!video) return
    setExporting(true)
    setExportProgress("Uploading…")
    try {
      const form = new FormData()
      form.append("file", video.file, video.file.name)
      form.append(
        "props",
        JSON.stringify({
          mainCrop,
          webcam: {
            enabled: webcamEnabled,
            source: webcamSource,
            placement: webcamPlacement,
            radius: 24,
          },
          background: "#000000",
          durationInFrames,
          fps: FPS,
        })
      )
      setExportProgress("Rendering…")
      const res = await fetch("/api/render-vertical", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Render failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${video.file.name.replace(/\.[^.]+$/, "")}-vertical.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setExportProgress(null)
    } catch (err) {
      console.error(err)
      setExportProgress(err instanceof Error ? err.message : "Render failed")
    } finally {
      setExporting(false)
    }
  }

  if (!video) {
    return (
      <div className="h-full p-4 md:p-6">
        <Dropzone
          onFile={handleUpload}
          accept="video/*"
          icon={VideoReplayIcon}
          label="Drop a horizontal clip to reframe"
          hint="MP4 · 16:9 or wider works best"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:gap-6 md:p-6">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex-1 overflow-hidden rounded-xl border bg-black">
          <div
            className="relative mx-auto h-full"
            style={{ aspectRatio: `${video.width} / ${video.height}` }}
          >
            <video
              src={video.url}
              className="absolute inset-0 h-full w-full object-contain"
              muted
              loop
              playsInline
              autoPlay
            />
            <RectOverlay
              rect={mainCrop}
              onChange={setMainCrop}
              aspectLock={OUTPUT_ASPECT}
              accent="primary"
              label="Frame"
            />
            {webcamEnabled && (
              <RectOverlay
                rect={webcamSource}
                onChange={setWebcamSource}
                accent="accent"
                label="Webcam"
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {video.file.name} · {video.width}×{video.height} ·{" "}
            {video.duration.toFixed(1)}s
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            <HugeiconsIcon icon={Refresh01Icon} />
            Replace
          </Button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex-1 overflow-hidden rounded-xl border bg-black">
          <div className="relative mx-auto h-full" style={{ aspectRatio: "9 / 16" }}>
            <Player
              component={VerticalClip}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={OUTPUT_WIDTH}
              compositionHeight={OUTPUT_HEIGHT}
              style={{ width: "100%", height: "100%" }}
              loop
              autoPlay
              controls={false}
            />
            {webcamEnabled && (
              <RectOverlay
                rect={webcamPlacement}
                onChange={setWebcamPlacement}
                accent="accent"
                label="Place"
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>1080 × 1920 · 9:16 preview</span>
          <span>Live preview</span>
        </div>
      </section>

      <section className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t pt-3 md:border-0 md:pt-0">
        <WebcamToggle
          enabled={webcamEnabled}
          onToggle={() => setWebcamEnabled((v) => !v)}
        />
        <div className="flex items-center gap-3">
          {exportProgress && (
            <span className="text-xs text-muted-foreground">
              {exportProgress}
            </span>
          )}
          <Button size="lg" onClick={handleExport} disabled={exporting}>
            <HugeiconsIcon icon={Download01Icon} />
            {exporting ? "Rendering…" : "Export MP4"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function WebcamToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
        enabled
          ? "border-foreground/20 bg-foreground text-background"
          : "border-border bg-transparent text-foreground hover:bg-muted"
      )}
    >
      <HugeiconsIcon icon={CameraVideoIcon} size={14} />
      Webcam overlay {enabled ? "on" : "off"}
    </button>
  )
}
