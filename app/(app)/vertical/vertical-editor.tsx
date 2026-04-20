"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CameraVideoIcon,
  Download01Icon,
  Refresh01Icon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { FitBox } from "@/components/fit-box"
import { RectOverlay } from "@/components/rect-overlay"
import { VerticalPreview } from "@/components/vertical-preview"
import { cn } from "@/lib/utils"
import { OUTPUT_ASPECT, OUTPUT_HEIGHT, OUTPUT_WIDTH, type Rect } from "@/compositions/types"

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

/** Default 9:16 crop that fills the source vertically for a horizontal video. */
function defaultMainCrop(sourceAspect: number): Rect {
  // Pixel aspect of the normalized crop must equal OUTPUT_ASPECT (9/16).
  // rect.width/rect.height = OUTPUT_ASPECT / sourceAspect
  const ratio = sourceAspect / OUTPUT_ASPECT
  const width = Math.min(1, 1 / ratio)
  const height = Math.min(1, width * ratio)
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  }
}

/**
 * Webcam source pixel aspect in the original video coords.
 * Used to lock the placement rect's aspect so the webcam never gets squished.
 */
function webcamPixelAspect(source: Rect, meta: VideoMeta) {
  return (source.width * meta.width) / Math.max(1, source.height * meta.height)
}

/**
 * Placement aspect lock, expressed as a pixel aspect for the OUTPUT canvas.
 * The rect-overlay uses aspectLock as desired pixel aspect of the rect.
 */
function placementAspectLock(source: Rect, meta: VideoMeta) {
  // Placement pixel aspect == webcam source pixel aspect (no distortion).
  return webcamPixelAspect(source, meta)
}

/** Adjust placement rect so its pixel aspect matches the webcam source aspect. */
function syncPlacementAspect(placement: Rect, source: Rect, meta: VideoMeta): Rect {
  const targetAspect = webcamPixelAspect(source, meta)
  // ph * OUT_H should match pw * OUT_W / targetAspect
  // => ph = pw * (OUTPUT_WIDTH / OUTPUT_HEIGHT) / targetAspect
  const newHeight = Math.min(
    1,
    (placement.width * (OUTPUT_WIDTH / OUTPUT_HEIGHT)) / targetAspect
  )
  const newWidth =
    newHeight === 1
      ? Math.min(1, targetAspect / (OUTPUT_WIDTH / OUTPUT_HEIGHT))
      : placement.width
  return {
    width: newWidth,
    height: newHeight,
    x: Math.min(Math.max(placement.x, 0), 1 - newWidth),
    y: Math.min(Math.max(placement.y, 0), 1 - newHeight),
  }
}

export function VerticalEditor() {
  const [video, setVideo] = React.useState<VideoMeta | null>(null)
  const sourceVideoRef = React.useRef<HTMLVideoElement>(null)
  const [mainCrop, setMainCrop] = React.useState<Rect>({
    x: 0.342,
    y: 0,
    width: 0.316,
    height: 1,
  })
  const [webcamEnabled, setWebcamEnabled] = React.useState(false)
  const [webcamSource, setWebcamSource] = React.useState<Rect>({
    x: 0.02,
    y: 0.65,
    width: 0.22,
    height: 0.33,
  })
  const [webcamPlacement, setWebcamPlacement] = React.useState<Rect>({
    x: 0.04,
    y: 0.72,
    width: 0.32,
    height: 0.26,
  })
  const [exporting, setExporting] = React.useState(false)
  const [exportProgress, setExportProgress] = React.useState<string | null>(null)

  const sourceAspect = video ? video.width / video.height : 16 / 9

  const handleUpload = async (file: File) => {
    const meta = await loadVideo(file)
    setVideo(meta)
    setMainCrop(defaultMainCrop(meta.width / meta.height))
    // Seed placement aspect to match the default webcam source aspect.
    setWebcamPlacement((p) => syncPlacementAspect(p, webcamSource, meta))
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

  // Source aspect lock for the webcam body so user sees the same crop we'll render.
  const webcamLockAspect = video
    ? placementAspectLock(webcamSource, video)
    : undefined

  // When webcam source changes, propagate the new aspect to the placement.
  const onWebcamSourceChange = (next: Rect) => {
    setWebcamSource(next)
    if (video) {
      setWebcamPlacement((p) => syncPlacementAspect(p, next, video))
    }
  }

  // Keep placement aspect when the user resizes the placement.
  const onWebcamPlacementChange = (next: Rect) => {
    if (!video) {
      setWebcamPlacement(next)
      return
    }
    setWebcamPlacement(syncPlacementAspect(next, webcamSource, video))
  }

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
          sourceWidth: video.width,
          sourceHeight: video.height,
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
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-black">
          <FitBox aspect={video.width / video.height}>
            <video
              ref={sourceVideoRef}
              src={video.url}
              className="absolute inset-0 h-full w-full"
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
                onChange={onWebcamSourceChange}
                accent="accent"
                label="Webcam"
              />
            )}
          </FitBox>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {video.file.name} · {video.width}×{video.height} ·{" "}
            {video.duration.toFixed(1)}s · {sourceAspect.toFixed(2)}:1
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            <HugeiconsIcon icon={Refresh01Icon} />
            Replace
          </Button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-black">
          <FitBox aspect={OUTPUT_ASPECT}>
            <VerticalPreview
              videoUrl={video.url}
              sourceWidth={video.width}
              sourceHeight={video.height}
              mainCrop={mainCrop}
              webcam={{
                enabled: webcamEnabled,
                source: webcamSource,
                placement: webcamPlacement,
                radius: 24,
              }}
              background="#000000"
              sharedSrcRef={sourceVideoRef}
            />
            {webcamEnabled && (
              <RectOverlay
                rect={webcamPlacement}
                onChange={onWebcamPlacementChange}
                aspectLock={webcamLockAspect}
                accent="accent"
                label="Place"
              />
            )}
          </FitBox>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>1080 × 1920 · 9:16 preview</span>
          <span>Live · synced to source</span>
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
