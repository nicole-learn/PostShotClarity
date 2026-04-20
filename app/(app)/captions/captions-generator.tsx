"use client"

import * as React from "react"
import { Player, type PlayerRef } from "@remotion/player"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClosedCaptionIcon,
  Download01Icon,
  PauseIcon,
  PlayIcon,
  Refresh01Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { CaptionAnchorOverlay } from "@/components/caption-anchor-overlay"
import { StagedProgress } from "@/components/staged-progress"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { getFFmpeg } from "@/lib/ffmpeg"
import { extractAudio } from "@/lib/audio-extract"
import { cn } from "@/lib/utils"
import { Captions } from "@/compositions/captions/Captions"
import {
  DEFAULT_CAPTION_FPS,
  DEFAULT_CAPTION_LAYOUT,
  type CaptionLayout,
  type CaptionLine,
  type CaptionStyle,
  type CaptionsProps,
  type TranscribedWord,
} from "@/compositions/captions/types"

import { StylePicker } from "./style-picker"
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

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00.0"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0")
  const ms = Math.floor((t - Math.floor(t)) * 10)
  return `${m}:${s}.${ms}`
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
  }, [file, layout, lines, push, style, videoDuration, videoHeight, videoWidth])

  const updateLineText = (id: string, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))
  }

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

  React.useEffect(() => {
    const ref = playerRef.current
    if (!ref) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    ref.addEventListener("play", onPlay)
    ref.addEventListener("pause", onPause)
    return () => {
      ref.removeEventListener("play", onPlay)
      ref.removeEventListener("pause", onPause)
    }
  }, [videoUrl])

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
          icon={ClosedCaptionIcon}
          label="Drop a video clip to caption"
          hint="MP4 or WebM · speech will be transcribed automatically"
        />
      </div>
    )
  }

  const durationInFrames = Math.max(
    30,
    Math.ceil((videoDuration || 1) * PREVIEW_FPS)
  )
  const compositionWidth = videoWidth || 1280
  const compositionHeight = videoHeight || 720
  const probeReady = videoWidth > 0 && videoHeight > 0
  const hasLines = lines.length > 0

  const inputProps: CaptionsProps = {
    videoSrc: videoUrl,
    lines,
    style,
    layout,
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-[160px_1fr_340px] md:grid-rows-[1fr_auto] md:gap-4 md:p-5">
      <video
        ref={probeRef}
        src={videoUrl}
        preload="metadata"
        onLoadedMetadata={handleProbeLoaded}
        className="hidden"
      />

      <aside className="flex min-h-0 flex-col gap-2 md:row-span-2">
        <div className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Style
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <StylePicker value={style} onChange={setStyle} />
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-3 md:row-span-2">
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
                style={{ width: "100%", height: "100%" }}
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
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="absolute right-3 bottom-3 z-10 flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-e2 backdrop-blur transition-all hover:bg-background active:translate-y-px"
              >
                <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={16} />
              </button>
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

        <WordsPerLineSlider
          value={layout.maxWordsPerLine}
          onChange={(n) => setLayout((l) => ({ ...l, maxWordsPerLine: n }))}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="truncate text-xs text-muted-foreground">
            {file.name}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void transcribeFromFile()}
              disabled={busy || !probeReady}
            >
              <HugeiconsIcon icon={Refresh01Icon} />
              Retranscribe
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
              Replace
            </Button>
            <Button
              size="sm"
              onClick={() => void exportVideo()}
              disabled={busy || !hasLines || !probeReady}
            >
              <HugeiconsIcon icon={Download01Icon} />
              {exporting ? "Rendering…" : "Download with captions"}
            </Button>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-2 md:row-span-2">
        <div className="flex items-center justify-between">
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
              {lines.map((line) => (
                <CaptionRow
                  key={line.id}
                  line={line}
                  onChange={(text) => updateLineText(line.id, text)}
                  onDelete={() => deleteLine(line.id)}
                  onFocus={() => seekTo(line.start)}
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
  line,
  onChange,
  onDelete,
  onFocus,
}: {
  line: CaptionLine
  onChange: (text: string) => void
  onDelete: () => void
  onFocus: () => void
}) {
  return (
    <li className="group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onFocus}
        className="shrink-0 rounded px-1 py-0.5 font-mono text-[10px] tracking-tight text-muted-foreground tnum hover:bg-muted hover:text-foreground"
        title="Jump to this time"
      >
        {formatTime(line.start)}
      </button>
      <textarea
        value={line.text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        rows={Math.min(3, Math.max(1, Math.ceil(line.text.length / 34)))}
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

function WordsPerLineSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="flex flex-col">
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Words per line
        </span>
        <span className="mt-0.5 text-[13px] font-semibold tracking-tight tnum">
          {value === 0 ? "Auto" : `${value} ${value === 1 ? "word" : "words"}`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={8}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
        aria-label="Words per line"
      />
      <div className="flex gap-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        <span>Auto</span>
        <span className="text-muted-foreground/40">·</span>
        <span>8</span>
      </div>
    </div>
  )
}
