"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Download01Icon,
  PauseIcon,
  PlayIcon,
  Refresh01Icon,
  VideoReplayIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons"
import { Player, type PlayerRef } from "@remotion/player"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { StagedProgress } from "@/components/staged-progress"
import { useToast } from "@/components/toast"
import { pushRecent } from "@/lib/recent"
import { cn } from "@/lib/utils"
import memeSoundsData from "@/meme-sounds.json"
import { MemeSoundsClip } from "@/compositions/MemeSoundsClip"
import type { PlacedSound } from "@/compositions/types"

const FPS = 30

type VideoMeta = {
  file: File
  url: string
  duration: number
  width: number
  height: number
}

type LibrarySound = { name: string; url: string; label: string }

const library: LibrarySound[] = memeSoundsData.map((s) => ({
  name: s.name,
  url: s.url,
  label: prettifyName(s.name),
}))

function prettifyName(slug: string) {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ")
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

const audioDurationCache = new Map<string, number>()
function getAudioDuration(url: string): Promise<number> {
  const cached = audioDurationCache.get(url)
  if (cached !== undefined) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const a = new Audio()
    a.preload = "metadata"
    a.onloadedmetadata = () => {
      const d = isFinite(a.duration) ? a.duration : 2
      audioDurationCache.set(url, d)
      resolve(d)
    }
    a.onerror = () => reject(new Error("Couldn't load audio"))
    a.src = url
  })
}

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

let idSeed = 0
const makeId = () => `s${++idSeed}_${Date.now().toString(36)}`

export function MemeSoundsEditor() {
  const [video, setVideo] = React.useState<VideoMeta | null>(null)
  const [placedSounds, setPlacedSounds] = React.useState<PlacedSound[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [playheadFrame, setPlayheadFrame] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [previewingUrl, setPreviewingUrl] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)
  const [stageIndex, setStageIndex] = React.useState(0)
  const [stageProgress, setStageProgress] = React.useState(0)

  const playerRef = React.useRef<PlayerRef>(null)
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null)
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

  const durationInFrames = video
    ? Math.max(1, Math.floor(video.duration * FPS))
    : FPS
  const durationSec = video?.duration ?? 0

  const selected = placedSounds.find((s) => s.id === selectedId) ?? null

  React.useEffect(() => {
    const p = playerRef.current
    if (!p) return
    const onFrame = (e: { detail: { frame: number } }) =>
      setPlayheadFrame(e.detail.frame)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    p.addEventListener("frameupdate", onFrame)
    p.addEventListener("play", onPlay)
    p.addEventListener("pause", onPause)
    p.addEventListener("ended", onEnded)
    return () => {
      p.removeEventListener("frameupdate", onFrame)
      p.removeEventListener("play", onPlay)
      p.removeEventListener("pause", onPause)
      p.removeEventListener("ended", onEnded)
    }
  }, [video])

  React.useEffect(() => {
    if (!previewingUrl) return
    const a = new Audio(previewingUrl)
    previewAudioRef.current = a
    a.onended = () => setPreviewingUrl(null)
    a.play().catch(() => setPreviewingUrl(null))
    return () => {
      a.pause()
      a.src = ""
      previewAudioRef.current = null
    }
  }, [previewingUrl])

  const handleUpload = async (file: File) => {
    try {
      const meta = await loadVideo(file)
      setVideo(meta)
      setPlacedSounds([])
      setSelectedId(null)
      setPlayheadFrame(0)
      pushRecent({ tool: "meme-sounds", name: file.name, size: file.size })
    } catch {
      push({ message: "That clip couldn't be read", variant: "error" })
    }
  }

  const reset = () => {
    if (video) URL.revokeObjectURL(video.url)
    setVideo(null)
    setPlacedSounds([])
    setSelectedId(null)
    setPlayheadFrame(0)
    setIsPlaying(false)
    setStageIndex(0)
    setStageProgress(0)
  }

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (p.isPlaying()) p.pause()
    else p.play()
  }

  const seekSec = (sec: number) => {
    const p = playerRef.current
    if (!p || !video) return
    const frame = Math.max(
      0,
      Math.min(durationInFrames - 1, Math.round(sec * FPS))
    )
    p.seekTo(frame)
    setPlayheadFrame(frame)
  }

  const seekByFrames = (delta: number) => {
    const p = playerRef.current
    if (!p) return
    const next = Math.max(
      0,
      Math.min(durationInFrames - 1, p.getCurrentFrame() + delta)
    )
    p.seekTo(next)
    setPlayheadFrame(next)
  }

  const handleAddSound = async (lib: LibrarySound) => {
    if (!video) return
    try {
      const soundDur = await getAudioDuration(lib.url)
      const remainingSec = Math.max(0.1, durationSec - playheadFrame / FPS)
      const effectiveSec = Math.min(soundDur, remainingSec)
      const ps: PlacedSound = {
        id: makeId(),
        url: lib.url,
        name: lib.label,
        startFrame: playheadFrame,
        durationInFrames: Math.max(1, Math.round(effectiveSec * FPS)),
        volume: 1,
      }
      setPlacedSounds((arr) => [...arr, ps])
      setSelectedId(ps.id)
      push({ message: `Added "${lib.label}"`, variant: "success" })
    } catch {
      push({ message: "Couldn't load that sound", variant: "error" })
    }
  }

  const handlePreview = (url: string) => {
    if (previewingUrl === url) {
      setPreviewingUrl(null)
      return
    }
    setPreviewingUrl(url)
  }

  const handleDownloadSound = async (lib: LibrarySound) => {
    try {
      const res = await fetch(lib.url)
      if (!res.ok) throw new Error("Fetch failed")
      const blob = await res.blob()
      const ext =
        lib.url.split("?")[0].split(".").pop()?.toLowerCase() || "mp3"
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `${lib.name}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch {
      window.open(lib.url, "_blank", "noopener")
      push({
        message: "Opened in a new tab — right-click to save",
        variant: "info",
      })
    }
  }

  const moveSound = (id: string, startFrame: number) => {
    setPlacedSounds((arr) =>
      arr.map((s) => {
        if (s.id !== id) return s
        const max = Math.max(0, durationInFrames - s.durationInFrames)
        return { ...s, startFrame: Math.max(0, Math.min(max, startFrame)) }
      })
    )
  }

  const updateSound = (id: string, patch: Partial<PlacedSound>) => {
    setPlacedSounds((arr) =>
      arr.map((s) => (s.id === id ? { ...s, ...patch } : s))
    )
  }

  const deleteSound = React.useCallback(
    (id: string) => {
      setPlacedSounds((arr) => arr.filter((s) => s.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    },
    []
  )

  React.useEffect(() => {
    if (!video) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return
      if (e.code === "Space") {
        e.preventDefault()
        togglePlay()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        seekByFrames(e.shiftKey ? -FPS : -1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        seekByFrames(e.shiftKey ? FPS : 1)
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault()
        deleteSound(selectedId)
      } else if (e.key === "Escape") {
        setSelectedId(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, selectedId, durationInFrames, deleteSound])

  const playerInputProps = React.useMemo(() => {
    if (!video) return null
    return {
      videoSrc: video.url,
      videoWidth: video.width,
      videoHeight: video.height,
      sounds: placedSounds,
      durationInFrames,
      fps: FPS,
    }
  }, [video, placedSounds, durationInFrames])

  const handleExport = async () => {
    if (!video) return
    setExporting(true)
    setStageIndex(0)
    setStageProgress(0)
    try {
      const presignRes = await fetch("/api/render-meme-sounds/upload-url", {
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
      const startRes = await fetch("/api/render-meme-sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          props: {
            videoWidth: video.width,
            videoHeight: video.height,
            sounds: placedSounds,
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
          `/api/render-meme-sounds/progress?${progressQuery}`
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
      a.download = `${video.file.name.replace(/\.[^.]+$/, "")}-meme-sounds.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      push({ message: "Clip downloaded with sounds", variant: "success" })
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

  if (!video || !playerInputProps) {
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
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(400px,520px)] md:grid-rows-[1fr_auto] md:gap-5 md:p-6">
      <section className="flex min-h-0 flex-col gap-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-black">
          <Player
            ref={playerRef}
            component={MemeSoundsClip}
            inputProps={playerInputProps}
            compositionWidth={video.width}
            compositionHeight={video.height}
            durationInFrames={durationInFrames}
            fps={FPS}
            style={{ width: "100%", height: "100%" }}
            clickToPlay
            loop
          />
        </div>

        <Timeline
          videoUrl={video.url}
          durationSec={durationSec}
          fps={FPS}
          playheadFrame={playheadFrame}
          sounds={placedSounds}
          selectedId={selectedId}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSeek={seekSec}
          onSelect={setSelectedId}
          onMove={moveSound}
        />

        <InfoBar
          selected={selected}
          fps={FPS}
          durationSec={durationSec}
          onUpdate={(patch) =>
            selected && updateSound(selected.id, patch)
          }
          onDelete={() => selected && deleteSound(selected.id)}
        />
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card md:row-span-2">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            Sound Library
          </span>
          <span className="text-[10px] text-muted-foreground tnum">
            {library.length}
          </span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-2">
          {library.map((lib) => (
            <SoundCard
              key={lib.url}
              sound={lib}
              isPreviewing={previewingUrl === lib.url}
              onPreview={() => handlePreview(lib.url)}
              onAdd={() => handleAddSound(lib)}
              onDownload={() => handleDownloadSound(lib)}
            />
          ))}
        </div>
      </aside>

      <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 md:border-0 md:pt-0">
        <Button variant="ghost" size="sm" onClick={reset}>
          <HugeiconsIcon icon={Refresh01Icon} />
          Replace clip
        </Button>
        <div className="flex items-center gap-3">
          {exporting && (
            <StagedProgress
              stages={stages}
              currentIndex={stageIndex}
              progressInStage={stageProgress}
              className="w-48"
            />
          )}
          <Button
            size="lg"
            onClick={handleExport}
            disabled={exporting || placedSounds.length === 0}
          >
            <HugeiconsIcon icon={Download01Icon} />
            {exporting ? "Rendering…" : "Export MP4"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function Timeline({
  videoUrl,
  durationSec,
  fps,
  playheadFrame,
  sounds,
  selectedId,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSelect,
  onMove,
}: {
  videoUrl: string
  durationSec: number
  fps: number
  playheadFrame: number
  sounds: PlacedSound[]
  selectedId: string | null
  isPlaying: boolean
  onTogglePlay: () => void
  onSeek: (sec: number) => void
  onSelect: (id: string) => void
  onMove: (id: string, startFrame: number) => void
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const scrubbing = React.useRef(false)

  const rows = React.useMemo(() => layOutRows(sounds, fps), [sounds, fps])
  const rowCount = Math.max(1, rows.length)
  const trackHeight = 28 + rowCount * 30

  const playheadPct = durationSec > 0 ? (playheadFrame / fps / durationSec) * 100 : 0

  const seekFromClientX = React.useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onSeek(ratio * durationSec)
    },
    [onSeek, durationSec]
  )

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-pill]")) return
    scrubbing.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    seekFromClientX(e.clientX)
  }

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing.current) return
    seekFromClientX(e.clientX)
  }

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    scrubbing.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        <span>Timeline</span>
        <span className="tnum normal-case tracking-normal">
          {formatTime(playheadFrame / fps)} · {formatTime(durationSec)}
        </span>
      </div>
      <div className="flex items-stretch gap-0 overflow-hidden rounded-lg border bg-muted/30">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="group flex w-12 shrink-0 items-center justify-center border-r bg-background text-foreground transition-colors hover:bg-foreground hover:text-background active:translate-y-px"
        >
          <HugeiconsIcon
            icon={isPlaying ? PauseIcon : PlayIcon}
            size={16}
            strokeWidth={2}
          />
        </button>
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
          className="relative flex-1 cursor-pointer touch-none overflow-hidden select-none"
          style={{ height: trackHeight }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 border-b bg-muted/40">
            <TickMarks durationSec={durationSec} />
          </div>
          <VideoWaveform url={videoUrl} />

          {sounds.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-6 bottom-0 flex items-center justify-center">
              <span className="text-[11px] text-muted-foreground/70">
                Click a sound on the right to drop it at the playhead
              </span>
            </div>
          )}
          {rows.map((row, rowIndex) =>
            row.map((s) => (
              <SoundPill
                key={s.id}
                sound={s}
                rowIndex={rowIndex}
                durationSec={durationSec}
                fps={fps}
                selected={selectedId === s.id}
                onSelect={() => onSelect(s.id)}
                onMove={(startFrame) => onMove(s.id, startFrame)}
                trackRef={trackRef}
              />
            ))
          )}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-foreground"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="absolute top-1.5 -left-1 size-2 rounded-full bg-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}

const videoPeaksCache = new Map<string, number[]>()

async function extractVideoPeaks(url: string, bars: number): Promise<number[]> {
  const cached = videoPeaksCache.get(url)
  if (cached) return cached
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  type CtxCtor = { new (): AudioContext }
  type WindowLike = Window & { webkitAudioContext?: CtxCtor }
  const Ctor =
    (typeof window !== "undefined" &&
      (window.AudioContext ?? (window as WindowLike).webkitAudioContext)) ||
    null
  if (!Ctor) throw new Error("AudioContext unavailable")
  const ctx = new Ctor()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  const ch = decoded.getChannelData(0)
  const step = Math.max(1, Math.floor(ch.length / bars))
  const peaks: number[] = []
  for (let i = 0; i < bars; i++) {
    let max = 0
    const from = i * step
    const to = Math.min(ch.length, from + step)
    for (let j = from; j < to; j += 8) {
      const v = Math.abs(ch[j])
      if (v > max) max = v
    }
    peaks.push(max)
  }
  const mx = Math.max(...peaks, 0.001)
  const norm = peaks.map((p) => p / mx)
  videoPeaksCache.set(url, norm)
  return norm
}

const VideoWaveform = React.memo(function VideoWaveform({
  url,
}: {
  url: string
}) {
  const [peaks, setPeaks] = React.useState<number[] | null>(null)

  React.useEffect(() => {
    let cancelled = false
    extractVideoPeaks(url, 140)
      .then((p) => {
        if (!cancelled) setPeaks(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  if (!peaks) return null
  return (
    <div className="pointer-events-none absolute inset-x-1 top-6 bottom-1 flex items-center gap-[1px]">
      {peaks.map((p, i) => (
        <span
          key={i}
          className="flex-1 rounded-[1px] bg-foreground/15"
          style={{ height: `${Math.max(6, p * 75)}%` }}
        />
      ))}
    </div>
  )
})

function TickMarks({ durationSec }: { durationSec: number }) {
  const step = durationSec <= 10 ? 1 : durationSec <= 30 ? 5 : 10
  const ticks: number[] = []
  for (let t = 0; t <= durationSec; t += step) ticks.push(t)
  return (
    <div className="relative h-full w-full">
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex h-full flex-col items-center justify-center"
          style={{ left: `${(t / durationSec) * 100}%` }}
        >
          <div className="h-1.5 w-px bg-border" />
          <span className="mt-0.5 font-mono text-[9px] text-muted-foreground/70 tnum">
            {formatTime(t)}
          </span>
        </div>
      ))}
    </div>
  )
}

function layOutRows(sounds: PlacedSound[], fps: number): PlacedSound[][] {
  const rows: PlacedSound[][] = []
  const sorted = [...sounds].sort((a, b) => a.startFrame - b.startFrame)
  for (const s of sorted) {
    let placed = false
    for (const row of rows) {
      const last = row[row.length - 1]
      if (last.startFrame + last.durationInFrames <= s.startFrame + 0.1 * fps) {
        row.push(s)
        placed = true
        break
      }
    }
    if (!placed) rows.push([s])
  }
  return rows
}

function SoundPill({
  sound,
  rowIndex,
  durationSec,
  fps,
  selected,
  onSelect,
  onMove,
  trackRef,
}: {
  sound: PlacedSound
  rowIndex: number
  durationSec: number
  fps: number
  selected: boolean
  onSelect: () => void
  onMove: (startFrame: number) => void
  trackRef: React.RefObject<HTMLDivElement | null>
}) {
  const [draftStartFrame, setDraftStartFrame] = React.useState<number | null>(
    null
  )
  const pointerStart = React.useRef<{
    clientX: number
    startFrame: number
    moved: boolean
  } | null>(null)

  const effectiveStartFrame = draftStartFrame ?? sound.startFrame
  const maxStart = Math.max(
    0,
    durationSec * fps - sound.durationInFrames
  )

  const leftPct =
    durationSec > 0 ? (effectiveStartFrame / fps / durationSec) * 100 : 0
  const widthPct =
    durationSec > 0 ? (sound.durationInFrames / fps / durationSec) * 100 : 0
  const top = 28 + rowIndex * 30

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pointerStart.current = {
      clientX: e.clientX,
      startFrame: sound.startFrame,
      moved: false,
    }
    setDraftStartFrame(sound.startFrame)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = pointerStart.current
    const track = trackRef.current
    if (!start || !track) return
    const rect = track.getBoundingClientRect()
    const dx = e.clientX - start.clientX
    if (Math.abs(dx) > 2) start.moved = true
    const deltaSec = (dx / rect.width) * durationSec
    const next = Math.max(
      0,
      Math.min(maxStart, start.startFrame + deltaSec * fps)
    )
    setDraftStartFrame(next)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current
    const draft = draftStartFrame
    pointerStart.current = null
    setDraftStartFrame(null)
    if (start) {
      if (!start.moved) {
        onSelect()
      } else if (draft !== null && Math.round(draft) !== Math.round(start.startFrame)) {
        onMove(draft)
      }
    }
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      data-pill
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "group absolute flex h-[26px] cursor-grab items-center gap-1 overflow-hidden rounded-md border px-2 text-[11px] font-medium select-none",
        "transition-shadow",
        draftStartFrame !== null && "cursor-grabbing shadow-e2"
      )}
      style={{
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 2px)`,
        minWidth: 32,
        top,
        background: selected
          ? "color-mix(in oklch, var(--tool-sounds) 30%, var(--background))"
          : "color-mix(in oklch, var(--tool-sounds) 16%, var(--background))",
        borderColor: selected
          ? "color-mix(in oklch, var(--tool-sounds) 70%, transparent)"
          : "color-mix(in oklch, var(--tool-sounds) 35%, transparent)",
        color: "var(--foreground)",
      }}
      title={sound.name}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: "var(--tool-sounds)" }}
      />
      <span className="truncate">{sound.name}</span>
    </div>
  )
}

function InfoBar({
  selected,
  fps,
  durationSec,
  onUpdate,
  onDelete,
}: {
  selected: PlacedSound | null
  fps: number
  durationSec: number
  onUpdate: (patch: Partial<PlacedSound>) => void
  onDelete: () => void
}) {
  if (!selected) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground/70">
          Click a pill to edit it
        </span>
        <span className="hidden items-center gap-2 font-mono text-[10px] text-muted-foreground/60 sm:flex">
          <Kbd>Space</Kbd> play
          <Kbd>←→</Kbd> scrub
          <Kbd>Del</Kbd> remove
        </span>
      </div>
    )
  }
  const startSec = selected.startFrame / fps
  const endSec = (selected.startFrame + selected.durationInFrames) / fps
  return (
    <div className="flex h-9 flex-wrap items-center gap-3 rounded-md border bg-card px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: "var(--tool-sounds)" }}
        />
        <span className="truncate text-[12px] font-medium">{selected.name}</span>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground tnum">
        {formatTime(startSec)} → {formatTime(Math.min(durationSec, endSec))}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <HugeiconsIcon
          icon={VolumeHighIcon}
          size={12}
          strokeWidth={1.75}
          className="text-muted-foreground"
        />
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.01}
          value={selected.volume}
          onChange={(e) => onUpdate({ volume: Number(e.target.value) })}
          className="h-1 w-28 cursor-pointer accent-foreground"
        />
        <span className="w-8 font-mono text-[10px] text-muted-foreground tnum">
          {Math.round(selected.volume * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <HugeiconsIcon icon={Delete02Icon} />
          Remove
        </Button>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-background px-1 font-mono text-[9px] text-muted-foreground">
      {children}
    </kbd>
  )
}

const soundPeaksCache = new Map<string, number[]>()

async function extractSoundPeaks(url: string, bars: number): Promise<number[]> {
  const cached = soundPeaksCache.get(url)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) throw new Error("Fetch failed")
  const buf = await res.arrayBuffer()
  type CtxCtor = { new (): AudioContext }
  type WindowLike = Window & { webkitAudioContext?: CtxCtor }
  const Ctor =
    (typeof window !== "undefined" &&
      (window.AudioContext ?? (window as WindowLike).webkitAudioContext)) ||
    null
  if (!Ctor) throw new Error("AudioContext unavailable")
  const ctx = new Ctor()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  const ch = decoded.getChannelData(0)
  const step = Math.max(1, Math.floor(ch.length / bars))
  const peaks: number[] = []
  for (let i = 0; i < bars; i++) {
    let max = 0
    const from = i * step
    const to = Math.min(ch.length, from + step)
    for (let j = from; j < to; j += 4) {
      const v = Math.abs(ch[j])
      if (v > max) max = v
    }
    peaks.push(max)
  }
  const mx = Math.max(...peaks, 0.001)
  const norm = peaks.map((p) => p / mx)
  soundPeaksCache.set(url, norm)
  return norm
}

function SoundWaveform({ url }: { url: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const [peaks, setPeaks] = React.useState<number[] | null>(
    () => soundPeaksCache.get(url) ?? null
  )

  React.useEffect(() => {
    if (peaks) return
    const el = hostRef.current
    if (!el) return
    let cancelled = false
    const load = () => {
      extractSoundPeaks(url, 60)
        .then((p) => {
          if (!cancelled) setPeaks(p)
        })
        .catch(() => {})
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect()
          load()
        }
      },
      { rootMargin: "120px" }
    )
    obs.observe(el)
    return () => {
      cancelled = true
      obs.disconnect()
    }
  }, [url, peaks])

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 flex items-center gap-[1.5px] px-2.5"
      aria-hidden
    >
      {peaks
        ? peaks.map((p, i) => (
            <span
              key={i}
              className="flex-1 rounded-[1px]"
              style={{
                height: `${Math.max(10, p * 80)}%`,
                background:
                  "color-mix(in oklch, var(--tool-sounds) 18%, transparent)",
              }}
            />
          ))
        : Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="flex-1 rounded-[1px] bg-foreground/6"
              style={{
                height: `${18 + 18 * Math.abs(Math.sin(i / 2.8))}%`,
              }}
            />
          ))}
    </div>
  )
}

function SoundCard({
  sound,
  isPreviewing,
  onPreview,
  onAdd,
  onDownload,
}: {
  sound: LibrarySound
  isPreviewing: boolean
  onPreview: () => void
  onAdd: () => void
  onDownload: () => void
}) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        onAdd()
        ;(e.currentTarget as HTMLElement).blur()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onAdd()
        }
      }}
      title={`Add "${sound.label}" at playhead`}
      className={cn(
        "group relative flex h-14 cursor-pointer items-center overflow-hidden rounded-lg border bg-background transition-colors",
        "hover:border-foreground/20 hover:bg-muted/40 active:bg-muted",
        isPreviewing && "border-foreground/30 bg-muted"
      )}
    >
      <SoundWaveform url={sound.url} />
      <div className="relative flex h-full w-full items-center gap-2 px-2.5">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            stop(e)
            onPreview()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              stop(e)
              e.preventDefault()
              onPreview()
            }
          }}
          aria-label={isPreviewing ? "Stop preview" : "Preview sound"}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
            isPreviewing
              ? "border-transparent bg-foreground text-background"
              : "border-border bg-background/90 text-muted-foreground backdrop-blur hover:bg-background hover:text-foreground"
          )}
        >
          <HugeiconsIcon
            icon={isPreviewing ? PauseIcon : PlayIcon}
            size={11}
            strokeWidth={1.75}
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
          {sound.label}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            stop(e)
            onDownload()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              stop(e)
              e.preventDefault()
              onDownload()
            }
          }}
          aria-label={`Download ${sound.label}`}
          title={`Download "${sound.label}"`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <HugeiconsIcon icon={Download01Icon} size={11} strokeWidth={1.75} />
        </span>
      </div>
    </div>
  )
}
