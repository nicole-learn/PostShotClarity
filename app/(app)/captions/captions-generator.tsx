"use client"

import * as React from "react"
import { Player, type PlayerRef } from "@remotion/player"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  DragDropVerticalIcon,
  Refresh01Icon,
  Delete02Icon,
  PlusSignIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { CaptionAnchorOverlay } from "@/components/caption-anchor-overlay"
import { StagedProgress } from "@/components/staged-progress"
import { VideoScrubber } from "@/components/video-scrubber"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { getFFmpeg } from "@/lib/ffmpeg"
import { extractAudio } from "@/lib/audio-extract"
import { cn } from "@/lib/utils"
import { Captions } from "@/compositions/captions/Captions"
import {
  DEFAULT_CAPTION_FPS,
  DEFAULT_CAPTION_LAYOUT,
  DEFAULT_PRESET_INDEX,
  type CaptionAnimation,
  type CaptionLayout,
  type CaptionLine,
  type CaptionPresetIndex,
  type CaptionStyle,
  type CaptionsProps,
  type TranscribedWord,
} from "@/compositions/captions/types"

import { StylePicker } from "./style-picker"
import { AnimationPicker } from "./animation-picker"
import { ColorPicker } from "./color-picker"
import { groupWordsIntoLines } from "./group-words"

type TranscribeResponse = {
  duration: number
  words: TranscribedWord[]
  text?: string
  language?: string
}

type UploadUrlResponse = {
  uploadUrl: string
  key: string
  contentType: string
}

const PREVIEW_FPS = DEFAULT_CAPTION_FPS

// Hoisted so the Player doesn't receive a new `style` object reference on every
// parent re-render (scrubber updates currentFrame 30x/sec — without stable refs,
// the Player thrashes its prop diff and triggers <Video> resync seeks).
const PLAYER_STYLE = { width: "100%", height: "100%" } as const

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00.0"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0")
  const ms = Math.floor((t - Math.floor(t)) * 10)
  return `${m}:${s}.${ms}`
}

// Parse "m:ss.d", "mm:ss", or plain seconds ("12.3") into a number of seconds.
function parseTime(str: string): number | null {
  const s = str.trim()
  if (!s) return null
  const m = s.match(/^(?:(\d+):)?(\d+)(?:\.(\d+))?$/)
  if (!m) return null
  const mins = m[1] ? parseInt(m[1], 10) : 0
  const secs = parseInt(m[2], 10)
  const frac = m[3] ? parseFloat(`0.${m[3]}`) : 0
  return mins * 60 + secs + frac
}

async function presign(
  fileName: string,
  contentType: string,
  prefix: "audio" | "video"
): Promise<UploadUrlResponse> {
  const res = await fetch("/api/render-captions/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType, prefix }),
  })
  if (!res.ok) throw new Error("Couldn't get upload URL")
  return (await res.json()) as UploadUrlResponse
}

async function uploadToS3(
  blob: Blob,
  url: string,
  contentType: string,
  onProgress?: (ratio: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(e.loaded / e.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.send(blob)
  })
}

export function CaptionsGenerator() {
  const [file, setFile] = React.useState<File | null>(null)
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null)
  const [videoWidth, setVideoWidth] = React.useState(0)
  const [videoHeight, setVideoHeight] = React.useState(0)
  const [videoDuration, setVideoDuration] = React.useState(0)
  const [lines, setLines] = React.useState<CaptionLine[]>([])
  const [style, setStyle] = React.useState<CaptionStyle>("clean")
  const [layout, setLayout] = React.useState<CaptionLayout>(
    DEFAULT_CAPTION_LAYOUT
  )
  const [animation, setAnimation] =
    React.useState<CaptionAnimation>("fade")
  const [presetIndex, setPresetIndex] =
    React.useState<CaptionPresetIndex>(DEFAULT_PRESET_INDEX)
  const [ffmpegReady, setFfmpegReady] = React.useState(false)
  const [transcribing, setTranscribing] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [stageIndex, setStageIndex] = React.useState(0)
  const [stageProgress, setStageProgress] = React.useState(0)
  const [stages, setStages] = React.useState<Array<{ label: string; weight: number }>>([
    { label: "Extracting audio", weight: 1 },
    { label: "Transcribing", weight: 2 },
  ])
  const [playing, setPlaying] = React.useState(false)
  const [currentFrame, setCurrentFrame] = React.useState(0)
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null)
  const playerRef = React.useRef<PlayerRef>(null)
  const probeRef = React.useRef<HTMLVideoElement>(null)
  const { push } = useToast()

  const busy = transcribing || exporting

  const warmupFFmpeg = React.useCallback(() => {
    if (ffmpegReady) return
    getFFmpeg()
      .then(() => setFfmpegReady(true))
      .catch(() => {})
  }, [ffmpegReady])

  const reset = React.useCallback(() => {
    setFile(null)
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setLines([])
    setVideoWidth(0)
    setVideoHeight(0)
    setVideoDuration(0)
    setStageIndex(0)
    setStageProgress(0)
    setPlaying(false)
    setCurrentFrame(0)
    setOutputUrl(null)
  }, [])

  const loadFile = React.useCallback(
    async (f: File) => {
      setFile(f)
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
      setLines([])
      setStageProgress(0)
      setPlaying(false)
      setCurrentFrame(0)
      setOutputUrl(null)
      pushRecent({ tool: "captions", name: f.name, size: f.size })
      warmupFFmpeg()
    },
    [warmupFFmpeg]
  )

  React.useEffect(() => {
    return () => {
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  const transcribeFromFile = React.useCallback(async () => {
    if (!file) return
    setStages([
      { label: "Extracting audio", weight: 1 },
      { label: "Uploading", weight: 1 },
      { label: "Transcribing", weight: 2 },
    ])
    setTranscribing(true)
    setStageIndex(0)
    setStageProgress(0)
    setOutputUrl(null)
    try {
      const audio = await extractAudio(file, (r) => setStageProgress(r))

      setStageIndex(1)
      setStageProgress(0)
      const { uploadUrl, key, contentType } = await presign(
        "audio.m4a",
        audio.type || "audio/mp4",
        "audio"
      )
      await uploadToS3(audio, uploadUrl, contentType, (r) =>
        setStageProgress(r)
      )

      setStageIndex(2)
      setStageProgress(0)
      const startedAt = Date.now()
      const timer = window.setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000
        setStageProgress(Math.min(0.95, elapsed / 25))
      }, 250)

      let data: TranscribeResponse
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(err?.error || `Transcription failed (${res.status})`)
        }
        data = (await res.json()) as TranscribeResponse
      } finally {
        window.clearInterval(timer)
      }

      setStageProgress(1)

      if (!data.words || data.words.length === 0) {
        push({
          message: "No speech detected in this clip",
          variant: "error",
        })
        return
      }

      setLines(groupWordsIntoLines(data.words))
      push({
        message: `Transcribed ${data.words.length} words`,
        variant: "success",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed"
      push({ message: msg, variant: "error" })
    } finally {
      setTranscribing(false)
    }
  }, [file, push])

  const handleProbeLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    const w = v.videoWidth || 1280
    const h = v.videoHeight || 720
    setVideoWidth(w)
    setVideoHeight(h)
    setVideoDuration(v.duration || 0)
    void transcribeFromFile()
  }

  const exportVideo = React.useCallback(async () => {
    if (!file || !videoWidth || !videoHeight || lines.length === 0) return
    setStages([
      { label: "Uploading video", weight: 2 },
      { label: "Rendering", weight: 5 },
    ])
    setExporting(true)
    setStageIndex(0)
    setStageProgress(0)
    setOutputUrl(null)

    try {
      const { uploadUrl, key, contentType } = await presign(
        file.name,
        file.type || "video/mp4",
        "video"
      )
      await uploadToS3(
        file,
        uploadUrl,
        contentType || file.type || "video/mp4",
        (r) => setStageProgress(r)
      )
      setStageIndex(1)
      setStageProgress(0)

      const duration = videoDuration || Math.max(...lines.map((l) => l.end), 1)
      const durationInFrames = Math.max(
        DEFAULT_CAPTION_FPS,
        Math.ceil(duration * DEFAULT_CAPTION_FPS)
      )

      const startRes = await fetch("/api/render-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          props: {
            lines,
            style,
            layout,
            animation,
            presetIndex,
            fps: DEFAULT_CAPTION_FPS,
            durationInFrames,
            width: videoWidth,
            height: videoHeight,
          },
        }),
      })
      if (!startRes.ok) {
        const err = (await startRes.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error || "Render failed to start")
      }
      const { renderId, bucketName } = (await startRes.json()) as {
        renderId: string
        bucketName: string
      }

      const progressQuery = new URLSearchParams({
        renderId,
        bucketName,
        inputKey: key,
      }).toString()

      let finalUrl: string | null = null
      while (true) {
        await new Promise((r) => setTimeout(r, 3000))
        const res = await fetch(
          `/api/render-captions/progress?${progressQuery}`
        )
        if (!res.ok) throw new Error("Progress check failed")
        const data = (await res.json()) as {
          done: boolean
          outputUrl?: string
          overallProgress?: number
          error?: string
        }
        if (data.error) throw new Error(data.error)
        if (data.done && data.outputUrl) {
          finalUrl = data.outputUrl
          break
        }
        setStageProgress(data.overallProgress ?? 0)
      }

      setStageProgress(1)
      setOutputUrl(finalUrl)
      push({ message: "Video rendered", variant: "success" })
      if (finalUrl) {
        const a = document.createElement("a")
        a.href = finalUrl
        a.download = ""
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed"
      push({ message: msg, variant: "error" })
    } finally {
      setExporting(false)
    }
  }, [
    animation,
    file,
    layout,
    lines,
    presetIndex,
    push,
    style,
    videoDuration,
    videoHeight,
    videoWidth,
  ])

  const updateLineText = (id: string, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))
  }

  const updateLineTiming = (
    id: string,
    patch: { start?: number; end?: number }
  ) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const nextStart = patch.start ?? l.start
        const nextEnd = patch.end ?? l.end
        return { ...l, start: nextStart, end: nextEnd }
      })
    )
  }

  const moveLine = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return
    setLines((prev) => {
      if (from >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      // Matches the drop indicator: dragging down puts the row *below* the
      // target (target's post-removal index + 1 = to), dragging up puts it
      // *above* the target (target's index = to). Both are splice(to).
      next.splice(to, 0, moved)
      return next
    })
  }

  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropIndex, setDropIndex] = React.useState<number | null>(null)

  const deleteLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const addLine = () => {
    const last = lines[lines.length - 1]
    const start = last ? Math.min(videoDuration, last.end + 0.1) : 0
    const end = Math.min(videoDuration || start + 2, start + 2)
    setLines((prev) => [
      ...prev,
      {
        id: `line-new-${Date.now()}`,
        text: "New caption",
        start,
        end,
        words: [],
      },
    ])
  }

  const seekTo = (seconds: number) => {
    const ref = playerRef.current
    if (!ref) return
    ref.seekTo(Math.round(seconds * PREVIEW_FPS))
  }

  const togglePlay = () => {
    const ref = playerRef.current
    if (!ref) return
    if (ref.isPlaying()) ref.pause()
    else ref.play()
  }

  // videoWidth/videoHeight flip to nonzero when the probe finishes; that's
  // what gates the Player from mounting, so we wait on them here to make
  // sure playerRef.current is populated before attaching listeners.
  React.useEffect(() => {
    if (!videoUrl || videoWidth === 0 || videoHeight === 0) return
    const ref = playerRef.current
    if (!ref) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onFrame = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame)
    }
    const onSeeked = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame)
    }
    const onEnded = () => setPlaying(false)
    ref.addEventListener("play", onPlay)
    ref.addEventListener("pause", onPause)
    ref.addEventListener("ended", onEnded)
    ref.addEventListener("frameupdate", onFrame)
    ref.addEventListener("seeked", onSeeked)
    // Sync once immediately in case the player already advanced before we hooked up.
    setCurrentFrame(ref.getCurrentFrame())
    setPlaying(ref.isPlaying())
    return () => {
      ref.removeEventListener("play", onPlay)
      ref.removeEventListener("pause", onPause)
      ref.removeEventListener("ended", onEnded)
      ref.removeEventListener("frameupdate", onFrame)
      ref.removeEventListener("seeked", onSeeked)
    }
  }, [videoUrl, videoWidth, videoHeight])

  // Memoize so `inputProps` only changes when the underlying caption data does,
  // not when the scrubber's currentFrame state re-renders the parent. A new
  // object literal every frame was forcing the Player's composition to re-diff
  // (and sometimes re-sync the <Video>), which in turn seeked the video backward
  // across Sequence boundaries and remounted caption chunks — replaying the
  // mount animation and making the caption appear to "play twice."
  //
  // This must live above the early return below so React sees the same hook
  // order whether or not a file is loaded (Rules of Hooks).
  const inputProps = React.useMemo<CaptionsProps>(
    () => ({
      videoSrc: videoUrl ?? "",
      lines,
      style,
      layout,
      animation,
      presetIndex,
    }),
    [videoUrl, lines, style, layout, animation, presetIndex]
  )

  if (!file || !videoUrl) {
    return (
      <div
        className="h-full p-4 md:p-6"
        onPointerEnter={warmupFFmpeg}
        onFocus={warmupFFmpeg}
      >
        <Dropzone
          onFile={loadFile}
          accept="video/*"
          icon={VideoReplayIcon}
          label="Drop a video"
        />
      </div>
    )
  }

  const durationInFrames = Math.max(
    30,
    Math.ceil((videoDuration || 1) * PREVIEW_FPS)
  )
  // Cap the preview composition at 720p short-edge. The composition is CSS-scaled
  // to fill the preview box anyway, and rasterizing captions (text-shadow, stroke,
  // backdrop-filter, drop-shadow) at native 1080p/4K is the main source of
  // scrub/playback stutter. Lambda render uses the untouched native size.
  const PREVIEW_MAX_SHORT_EDGE = 720
  const rawW = videoWidth || 1280
  const rawH = videoHeight || 720
  const previewScale = Math.min(
    1,
    PREVIEW_MAX_SHORT_EDGE / Math.max(1, Math.min(rawW, rawH))
  )
  const compositionWidth = Math.max(2, Math.round((rawW * previewScale) / 2) * 2)
  const compositionHeight = Math.max(2, Math.round((rawH * previewScale) / 2) * 2)
  const probeReady = videoWidth > 0 && videoHeight > 0
  const hasLines = lines.length > 0

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-[150px_170px_1fr_320px] md:grid-rows-[1fr_auto] md:gap-4 md:p-5">
      <video
        ref={probeRef}
        src={videoUrl}
        preload="metadata"
        onLoadedMetadata={handleProbeLoaded}
        className="hidden"
      />

      <aside className="flex min-h-0 flex-col gap-2 md:col-start-1 md:row-start-1">
        <div className="flex h-6 items-center font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Style
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <StylePicker value={style} onChange={setStyle} />
        </div>
      </aside>

      <aside className="flex min-h-0 flex-col gap-2 md:col-start-2 md:row-start-1">
        <div className="flex flex-col gap-2">
          <div className="flex h-6 items-center font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            Animation
          </div>
          <AnimationPicker value={animation} onChange={setAnimation} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 border-t pt-4">
          <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            Color
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ColorPicker
              style={style}
              value={presetIndex[style] ?? 0}
              onChange={(i) =>
                setPresetIndex((prev) => ({ ...prev, [style]: i }))
              }
            />
          </div>
        </div>
      </aside>

      <div className="md:col-start-1 md:col-span-2 md:row-start-2">
        <CharsPerLineSlider
          value={layout.maxCharsPerLine}
          onChange={(n) => setLayout((l) => ({ ...l, maxCharsPerLine: n }))}
        />
      </div>

      <section className="flex min-h-0 flex-col gap-2 md:col-start-3 md:row-span-2">
        <div className="flex h-6 items-center justify-between gap-2">
          <div className="truncate text-xs text-muted-foreground">
            {file.name}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void transcribeFromFile()}
              disabled={busy || !probeReady}
              aria-label="Retranscribe"
              title="Retranscribe"
            >
              <HugeiconsIcon icon={Refresh01Icon} />
            </Button>
            <Button variant="ghost" size="xs" onClick={reset} disabled={busy}>
              Replace
            </Button>
            <Button
              size="xs"
              onClick={() => void exportVideo()}
              disabled={busy || !hasLines || !probeReady}
            >
              <HugeiconsIcon icon={Download01Icon} />
              {exporting ? "Rendering…" : "Download with captions"}
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-black">
          <div
            className="relative max-h-full max-w-full"
            style={{
              aspectRatio: `${compositionWidth} / ${compositionHeight}`,
              width: "100%",
            }}
          >
            {probeReady ? (
              <Player
                ref={playerRef}
                component={Captions}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                fps={PREVIEW_FPS}
                style={PLAYER_STYLE}
                clickToPlay={false}
                controls={false}
                loop
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Loading video…
              </div>
            )}
            {probeReady && !busy && hasLines && (
              <CaptionAnchorOverlay layout={layout} onChange={setLayout} />
            )}
            {probeReady && !busy && (
              <VideoScrubber
                playing={playing}
                currentFrame={currentFrame}
                durationInFrames={durationInFrames}
                fps={PREVIEW_FPS}
                onTogglePlay={togglePlay}
                onSeek={(frame) => playerRef.current?.seekTo(frame)}
                className="absolute inset-x-3 bottom-3 z-20"
              />
            )}
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center text-white backdrop-blur-sm">
                <div className="animate-shimmer h-24 w-36 rounded-lg opacity-80" />
                <StagedProgress
                  stages={stages}
                  currentIndex={stageIndex}
                  progressInStage={stageProgress}
                  className="w-56"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-2 md:col-start-4 md:row-span-2">
        <div className="flex h-6 items-center justify-between">
          <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            Captions {hasLines ? `· ${lines.length}` : ""}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={addLine}
            disabled={!probeReady || busy}
          >
            <HugeiconsIcon icon={PlusSignIcon} />
            Add
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card/50">
          {hasLines ? (
            <ul className="divide-y">
              {lines.map((line, index) => (
                <CaptionRow
                  key={line.id}
                  index={index}
                  line={line}
                  videoDuration={videoDuration}
                  dragIndex={dragIndex}
                  dropIndex={dropIndex}
                  onChange={(text) => updateLineText(line.id, text)}
                  onTiming={(patch) => updateLineTiming(line.id, patch)}
                  onDelete={() => deleteLine(line.id)}
                  onFocus={() => seekTo(line.start)}
                  onDragStart={(i) => {
                    setDragIndex(i)
                    setDropIndex(i)
                  }}
                  onDragOver={(i) => setDropIndex(i)}
                  onDrop={() => {
                    if (dragIndex !== null && dropIndex !== null) {
                      moveLine(dragIndex, dropIndex)
                    }
                    setDragIndex(null)
                    setDropIndex(null)
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDropIndex(null)
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center text-xs text-muted-foreground">
              {transcribing
                ? "Transcribing…"
                : "Captions will appear here after transcription."}
            </div>
          )}
        </div>
        {outputUrl && (
          <a
            href={outputUrl}
            className="truncate rounded-md border bg-card px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Download link →
          </a>
        )}
      </aside>
    </div>
  )
}

function CaptionRow({
  index,
  line,
  videoDuration,
  dragIndex,
  dropIndex,
  onChange,
  onTiming,
  onDelete,
  onFocus,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  index: number
  line: CaptionLine
  videoDuration: number
  dragIndex: number | null
  dropIndex: number | null
  onChange: (text: string) => void
  onTiming: (patch: { start?: number; end?: number }) => void
  onDelete: () => void
  onFocus: () => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const [rowDraggable, setRowDraggable] = React.useState(false)
  const [startDraft, setStartDraft] = React.useState<string | null>(null)
  const [endDraft, setEndDraft] = React.useState<string | null>(null)

  const commitStart = () => {
    if (startDraft === null) return
    const parsed = parseTime(startDraft)
    setStartDraft(null)
    if (parsed === null || parsed < 0 || parsed >= line.end) return
    onTiming({ start: parsed })
  }

  const commitEnd = () => {
    if (endDraft === null) return
    const parsed = parseTime(endDraft)
    const max = videoDuration > 0 ? videoDuration + 0.5 : Infinity
    setEndDraft(null)
    if (parsed === null || parsed <= line.start || parsed > max) return
    onTiming({ end: parsed })
  }

  const isDragging = dragIndex === index
  const isDropTarget =
    dragIndex !== null && dropIndex === index && dragIndex !== index
  const showTopInsertLine = isDropTarget && dragIndex! > index
  const showBottomInsertLine = isDropTarget && dragIndex! < index

  return (
    <li
      draggable={rowDraggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", String(index))
        onDragStart(index)
      }}
      onDragOver={(e) => {
        if (dragIndex === null) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        onDragOver(index)
      }}
      onDrop={(e) => {
        if (dragIndex === null) return
        e.preventDefault()
        onDrop()
        setRowDraggable(false)
      }}
      onDragEnd={() => {
        setRowDraggable(false)
        onDragEnd()
      }}
      className={cn(
        "group relative flex items-start gap-1.5 px-2 py-2 transition-colors hover:bg-muted/40",
        isDragging && "opacity-40",
        showTopInsertLine &&
          "before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:bg-primary",
        showBottomInsertLine &&
          "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary"
      )}
    >
      <button
        type="button"
        onMouseDown={() => setRowDraggable(true)}
        onMouseUp={() => setRowDraggable(false)}
        onBlur={() => setRowDraggable(false)}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="mt-1 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <HugeiconsIcon
          icon={DragDropVerticalIcon}
          size={12}
          strokeWidth={1.75}
        />
      </button>
      <div className="flex shrink-0 flex-col gap-0.5">
        <input
          type="text"
          value={startDraft ?? formatTime(line.start)}
          onChange={(e) => setStartDraft(e.target.value)}
          onBlur={commitStart}
          onFocus={() => {
            onFocus()
            setStartDraft(formatTime(line.start))
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") {
              setStartDraft(null)
              e.currentTarget.blur()
            }
          }}
          aria-label="Start time"
          title="Start time"
          className="w-14 rounded px-1 py-0.5 text-left font-mono text-[10px] tracking-tight text-muted-foreground tnum hover:bg-muted focus:bg-background focus:text-foreground focus:outline focus:outline-1 focus:outline-border"
        />
        <input
          type="text"
          value={endDraft ?? formatTime(line.end)}
          onChange={(e) => setEndDraft(e.target.value)}
          onBlur={commitEnd}
          onFocus={() => setEndDraft(formatTime(line.end))}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") {
              setEndDraft(null)
              e.currentTarget.blur()
            }
          }}
          aria-label="End time"
          title="End time"
          className="w-14 rounded px-1 py-0.5 text-left font-mono text-[10px] tracking-tight text-muted-foreground tnum hover:bg-muted focus:bg-background focus:text-foreground focus:outline focus:outline-1 focus:outline-border"
        />
      </div>
      <textarea
        value={line.text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        rows={Math.min(3, Math.max(1, Math.ceil(line.text.length / 28)))}
        className={cn(
          "flex-1 resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] leading-snug",
          "focus:border-border focus:bg-background focus:outline-none"
        )}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete caption"
        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
      </button>
    </li>
  )
}

function CharsPerLineSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <input
      type="range"
      min={0}
      max={50}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
      aria-label="Max characters per line"
    />
  )
}
