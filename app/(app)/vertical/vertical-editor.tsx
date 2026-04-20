"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CameraVideoIcon,
  Download01Icon,
  Grid02Icon,
  Refresh01Icon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { FitBox } from "@/components/fit-box"
import { RectOverlay } from "@/components/rect-overlay"
import { VerticalPreview } from "@/components/vertical-preview"
import { ThirdsOverlay } from "@/components/thirds-overlay"
import { StagedProgress } from "@/components/staged-progress"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { cn } from "@/lib/utils"
import { OUTPUT_ASPECT, OUTPUT_WIDTH, OUTPUT_HEIGHT, type Rect } from "@/compositions/types"

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

function webcamPixelAspect(source: Rect, meta: VideoMeta) {
  return (source.width * meta.width) / Math.max(1, source.height * meta.height)
}

function placementAspectLock(source: Rect, meta: VideoMeta) {
  return webcamPixelAspect(source, meta)
}

function syncPlacementAspect(placement: Rect, source: Rect, meta: VideoMeta): Rect {
  const targetAspect = webcamPixelAspect(source, meta)
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
  const [showThirds, setShowThirds] = React.useState(false)
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
  const [stageIndex, setStageIndex] = React.useState(0)
  const [stageProgress, setStageProgress] = React.useState(0)
  const { push } = useToast()

  const stages = React.useMemo(
    () => [
      { label: "Uploading video", weight: 1 },
      { label: "Starting render", weight: 0.5 },
      { label: "Rendering", weight: 6 },
      { label: "Downloading", weight: 1 },
    ],
    []
  )

  const sourceAspect = video ? video.width / video.height : 16 / 9

  const handleUpload = async (file: File) => {
    try {
      const meta = await loadVideo(file)
      setVideo(meta)
      setMainCrop(defaultMainCrop(meta.width / meta.height))
      setWebcamPlacement((p) => syncPlacementAspect(p, webcamSource, meta))
      pushRecent({ tool: "vertical", name: file.name, size: file.size })
    } catch {
      push({ message: "That clip couldn't be read", variant: "error" })
    }
  }

  const reset = () => {
    if (video) URL.revokeObjectURL(video.url)
    setVideo(null)
    setWebcamEnabled(false)
    setStageIndex(0)
    setStageProgress(0)
  }

  const durationInFrames = video
    ? Math.max(1, Math.floor(video.duration * FPS))
    : FPS

  const webcamLockAspect = video
    ? placementAspectLock(webcamSource, video)
    : undefined

  const onWebcamSourceChange = (next: Rect) => {
    setWebcamSource(next)
    if (video) {
      setWebcamPlacement((p) => syncPlacementAspect(p, next, video))
    }
  }

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
    setStageIndex(0)
    setStageProgress(0)
    try {
      const presignRes = await fetch("/api/render-vertical/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: video.file.name,
          contentType: video.file.type || "video/mp4",
        }),
      })
      if (!presignRes.ok) throw new Error("Couldn't get upload URL")
      const { uploadUrl, key, contentType } = (await presignRes.json()) as {
        uploadUrl: string
        key: string
        contentType: string
      }

      setStageProgress(0.5)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: video.file,
      })
      if (!putRes.ok) throw new Error("Upload failed")

      setStageIndex(1)
      setStageProgress(0)
      const startRes = await fetch("/api/render-vertical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          props: {
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
          },
        }),
      })
      if (!startRes.ok) throw new Error("Couldn't start render")
      const { renderId, bucketName, inputKey } = (await startRes.json()) as {
        renderId: string
        bucketName: string
        inputKey: string
      }

      setStageIndex(2)
      setStageProgress(0)
      const progressQuery = new URLSearchParams({
        renderId,
        bucketName,
        inputKey,
      }).toString()

      let outputUrl: string | null = null
      while (!outputUrl) {
        await new Promise((r) => setTimeout(r, 3000))
        const progRes = await fetch(
          `/api/render-vertical/progress?${progressQuery}`
        )
        if (!progRes.ok) throw new Error("Progress check failed")
        const data = (await progRes.json()) as {
          done: boolean
          outputUrl?: string
          overallProgress?: number
          error?: string
        }
        if (data.error) throw new Error(data.error)
        if (data.done && data.outputUrl) {
          outputUrl = data.outputUrl
          break
        }
        setStageProgress(data.overallProgress ?? 0)
      }

      setStageIndex(3)
      setStageProgress(0)
      const fileRes = await fetch(outputUrl)
      if (!fileRes.ok) throw new Error("Download failed")
      const blob = await fileRes.blob()
      setStageProgress(1)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${video.file.name.replace(/\.[^.]+$/, "")}-vertical.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      push({ message: "Vertical clip downloaded", variant: "success" })
    } catch (err) {
      push({
        message:
          err instanceof Error ? err.message : "Render failed — try again",
        variant: "error",
      })
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
          <span className="truncate tnum">
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
            {showThirds && <ThirdsOverlay />}
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
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tnum">
          <span>1080 × 1920 · 9:16</span>
          <span>Live · synced</span>
        </div>
      </section>

      <section className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t pt-3 md:border-0 md:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <IconToggle
            active={showThirds}
            onClick={() => setShowThirds((v) => !v)}
            icon={Grid02Icon}
            label={showThirds ? "Thirds on" : "Thirds"}
          />
          <IconToggle
            active={webcamEnabled}
            onClick={() => setWebcamEnabled((v) => !v)}
            icon={CameraVideoIcon}
            label={webcamEnabled ? "Webcam on" : "Webcam"}
          />
        </div>
        <div className="flex items-center gap-3">
          {exporting && (
            <StagedProgress
              stages={stages}
              currentIndex={stageIndex}
              progressInStage={stageProgress}
              className="w-48"
            />
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

function IconToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Grid02Icon
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "border-foreground/20 bg-foreground text-background"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <HugeiconsIcon icon={icon} size={13} strokeWidth={1.75} />
      {label}
    </button>
  )
}
