"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CameraVideoIcon,
  CircleIcon,
  Download01Icon,
  Grid02Icon,
  Refresh01Icon,
  SquareIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { FitBox } from "@/components/fit-box"
import { NativeVideoScrubber } from "@/components/native-video-scrubber"
import { RectOverlay } from "@/components/rect-overlay"
import { VerticalPreview } from "@/components/vertical-preview"
import { ThirdsOverlay } from "@/components/thirds-overlay"
import { StagedProgress } from "@/components/staged-progress"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { cn } from "@/lib/utils"
import {
  OUTPUT_ASPECT,
  OUTPUT_WIDTH,
  OUTPUT_HEIGHT,
  type Rect,
} from "@/compositions/types"

const FPS = 30

type WebcamShape = "rect" | "circle"

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

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function clampRect(r: Rect): Rect {
  const width = clamp(r.width, 0.05, 1)
  const height = clamp(r.height, 0.05, 1)
  return {
    width,
    height,
    x: clamp(r.x, 0, 1 - width),
    y: clamp(r.y, 0, 1 - height),
  }
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

// Sync placement so its pixel-space aspect matches the webcam source crop.
function syncPlacementAspect(
  placement: Rect,
  source: Rect,
  meta: VideoMeta
): Rect {
  const targetAspect = webcamPixelAspect(source, meta)
  const newHeight = Math.min(
    1,
    (placement.width * (OUTPUT_WIDTH / OUTPUT_HEIGHT)) / targetAspect
  )
  const newWidth =
    newHeight === 1
      ? Math.min(1, targetAspect / (OUTPUT_WIDTH / OUTPUT_HEIGHT))
      : placement.width
  return clampRect({
    width: newWidth,
    height: newHeight,
    x: placement.x,
    y: placement.y,
  })
}

// Return a rect that is pixel-square inside a container of size (cw × ch),
// preserving the rect's centroid. In normalized coords: width*cw == height*ch.
function snapToPixelSquare(rect: Rect, cw: number, ch: number): Rect {
  const containerAspect = cw / ch
  let width = rect.width
  let height = width * containerAspect
  if (height > 1) {
    height = 1
    width = height / containerAspect
  }
  if (width > 1) {
    width = 1
    height = width * containerAspect
  }
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return clampRect({
    width,
    height,
    x: cx - width / 2,
    y: cy - height / 2,
  })
}

function snapSourceToSquare(source: Rect, meta: VideoMeta): Rect {
  return snapToPixelSquare(source, meta.width, meta.height)
}

function snapPlacementToSquare(placement: Rect): Rect {
  return snapToPixelSquare(placement, OUTPUT_WIDTH, OUTPUT_HEIGHT)
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
  const [webcamShape, setWebcamShape] = React.useState<WebcamShape>("rect")
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

  const handleUpload = async (file: File) => {
    try {
      const meta = await loadVideo(file)
      setVideo(meta)
      setMainCrop(defaultMainCrop(meta.width / meta.height))
      setWebcamSource((s) =>
        webcamShape === "circle" ? snapSourceToSquare(s, meta) : s
      )
      setWebcamPlacement((p) =>
        webcamShape === "circle"
          ? snapPlacementToSquare(p)
          : syncPlacementAspect(p, webcamSource, meta)
      )
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

  // Aspect locks passed to RectOverlay. Both rects are 1:1 in pixels when
  // shape === "circle" so the circular mask doesn't distort the source.
  const webcamSourceLock = webcamShape === "circle" ? 1 : undefined
  const webcamPlacementLock = video
    ? webcamShape === "circle"
      ? 1
      : webcamPixelAspect(webcamSource, video)
    : undefined

  const onWebcamSourceChange = (next: Rect) => {
    setWebcamSource(next)
    if (!video) return
    if (webcamShape === "circle") {
      // Overlay already enforces 1:1 via aspectLock, placement stays square.
      setWebcamPlacement((p) => snapPlacementToSquare(p))
      return
    }
    setWebcamPlacement((p) => syncPlacementAspect(p, next, video))
  }

  const onWebcamPlacementChange = (next: Rect) => {
    if (!video) {
      setWebcamPlacement(next)
      return
    }
    if (webcamShape === "circle") {
      setWebcamPlacement(next)
      return
    }
    setWebcamPlacement(syncPlacementAspect(next, webcamSource, video))
  }

  const onShapeChange = (next: WebcamShape) => {
    setWebcamShape(next)
    if (!video) return
    if (next === "circle") {
      const nextSource = snapSourceToSquare(webcamSource, video)
      setWebcamSource(nextSource)
      setWebcamPlacement((p) => snapPlacementToSquare(p))
    } else {
      setWebcamPlacement((p) => syncPlacementAspect(p, webcamSource, video))
    }
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
              shape: webcamShape,
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
          label="Drop a video"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:gap-6 md:p-6">
      <section className="relative min-h-0 overflow-hidden rounded-xl border bg-black">
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
              aspectLock={webcamSourceLock}
              accent="accent"
              label="Webcam"
            />
          )}
        </FitBox>
        <NativeVideoScrubber
          videoRef={sourceVideoRef}
          className="absolute inset-x-3 bottom-3 z-20"
        />
      </section>

      <section className="min-h-0 overflow-hidden rounded-xl border bg-black">
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
              shape: webcamShape,
            }}
            background="#000000"
            sharedSrcRef={sourceVideoRef}
          />
          {showThirds && <ThirdsOverlay />}
          {webcamEnabled && (
            <RectOverlay
              rect={webcamPlacement}
              onChange={onWebcamPlacementChange}
              aspectLock={webcamPlacementLock}
              accent="accent"
              label="Place"
            />
          )}
        </FitBox>
      </section>

      <section className="col-span-full flex items-center gap-2 border-t pt-3 md:border-0 md:pt-0">
        <IconToggle
          active={showThirds}
          onClick={() => setShowThirds((v) => !v)}
          icon={Grid02Icon}
          label="Thirds"
        />
        <IconToggle
          active={webcamEnabled}
          onClick={() => setWebcamEnabled((v) => !v)}
          icon={CameraVideoIcon}
          label="Webcam"
        />
        {webcamEnabled && (
          <>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <SegmentedShape value={webcamShape} onChange={onShapeChange} />
          </>
        )}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <IconToggle
          active={false}
          onClick={reset}
          icon={Refresh01Icon}
          label="Replace"
        />
        {exporting && (
          <StagedProgress
            stages={stages}
            currentIndex={stageIndex}
            progressInStage={stageProgress}
            className="ml-auto w-48"
          />
        )}
        <Button
          size="lg"
          onClick={handleExport}
          disabled={exporting}
          className={exporting ? "" : "ml-auto"}
        >
          <HugeiconsIcon icon={Download01Icon} />
          {exporting ? "Rendering…" : "Export MP4"}
        </Button>
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

function SegmentedShape({
  value,
  onChange,
}: {
  value: WebcamShape
  onChange: (v: WebcamShape) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Webcam shape"
      className="inline-flex h-9 items-center rounded-md border border-border bg-background p-0.5"
    >
      <ShapeButton
        icon={SquareIcon}
        label="Rect"
        active={value === "rect"}
        onClick={() => onChange("rect")}
      />
      <ShapeButton
        icon={CircleIcon}
        label="Circle"
        active={value === "circle"}
        onClick={() => onChange("circle")}
      />
    </div>
  )
}

function ShapeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Grid02Icon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <HugeiconsIcon icon={icon} size={13} strokeWidth={1.75} />
      {label}
    </button>
  )
}
