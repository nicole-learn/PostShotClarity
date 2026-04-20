"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  PlayIcon,
  PauseIcon,
  Refresh01Icon,
  VideoReplayIcon,
  Gif01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Dropzone } from "@/components/dropzone"
import { TrimSlider } from "@/components/trim-slider"
import { getFFmpeg } from "@/lib/ffmpeg"
import { cn } from "@/lib/utils"

const MAX_DURATION_LIMIT = 15
const FPS_OPTIONS = [10, 12, 15, 20, 24]
const WIDTH_OPTIONS = [240, 320, 480, 640]

function formatTime(t: number) {
  if (!isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0")
  const ms = Math.floor((t - Math.floor(t)) * 10)
  return `${m}:${s}.${ms}`
}

export function GifGenerator() {
  const [file, setFile] = React.useState<File | null>(null)
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null)
  const [duration, setDuration] = React.useState(0)
  const [start, setStart] = React.useState(0)
  const [end, setEnd] = React.useState(0)
  const [maxSpan, setMaxSpan] = React.useState(6)
  const [fps, setFps] = React.useState(12)
  const [width, setWidth] = React.useState(480)
  const [playing, setPlaying] = React.useState(false)
  const [working, setWorking] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [gifUrl, setGifUrl] = React.useState<string | null>(null)
  const [gifSize, setGifSize] = React.useState(0)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  const loadFile = (f: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (gifUrl) URL.revokeObjectURL(gifUrl)
    setFile(f)
    setVideoUrl(URL.createObjectURL(f))
    setGifUrl(null)
    setGifSize(0)
    setProgress(0)
  }

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (gifUrl) URL.revokeObjectURL(gifUrl)
    setFile(null)
    setVideoUrl(null)
    setGifUrl(null)
    setDuration(0)
    setStart(0)
    setEnd(0)
    setProgress(0)
  }

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => {
      if (video.currentTime >= end) {
        video.pause()
        video.currentTime = start
        setPlaying(false)
      }
    }
    video.addEventListener("timeupdate", onTime)
    return () => video.removeEventListener("timeupdate", onTime)
  }, [start, end])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start
      }
      video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const generate = async () => {
    if (!file) return
    setWorking(true)
    setProgress(0)
    if (gifUrl) URL.revokeObjectURL(gifUrl)
    setGifUrl(null)
    try {
      const ffmpeg = await getFFmpeg()
      const onProgress = ({ progress }: { progress: number }) => {
        setProgress(Math.max(0, Math.min(1, progress)))
      }
      ffmpeg.on("progress", onProgress)
      const buffer = new Uint8Array(await file.arrayBuffer())
      const ext = file.name.split(".").pop() || "mp4"
      const input = `input.${ext}`
      const palette = "palette.png"
      const output = "out.gif"
      await ffmpeg.writeFile(input, buffer)
      const dur = Math.max(0.1, end - start)
      const filter = `fps=${fps},scale=${width}:-1:flags=lanczos`

      await ffmpeg.exec([
        "-ss",
        start.toFixed(3),
        "-t",
        dur.toFixed(3),
        "-i",
        input,
        "-vf",
        `${filter},palettegen=stats_mode=diff`,
        "-y",
        palette,
      ])
      await ffmpeg.exec([
        "-ss",
        start.toFixed(3),
        "-t",
        dur.toFixed(3),
        "-i",
        input,
        "-i",
        palette,
        "-lavfi",
        `${filter} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5`,
        "-y",
        output,
      ])
      const data = (await ffmpeg.readFile(output)) as Uint8Array
      ffmpeg.off("progress", onProgress)
      const buf = new Uint8Array(data.byteLength)
      buf.set(data)
      const blob = new Blob([buf.buffer as ArrayBuffer], { type: "image/gif" })
      const url = URL.createObjectURL(blob)
      setGifUrl(url)
      setGifSize(blob.size)
      setProgress(1)
    } catch (err) {
      console.error(err)
    } finally {
      setWorking(false)
    }
  }

  const download = () => {
    if (!gifUrl || !file) return
    const a = document.createElement("a")
    a.href = gifUrl
    a.download = `${file.name.replace(/\.[^.]+$/, "")}.gif`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (!file || !videoUrl) {
    return (
      <div className="h-full p-4 md:p-6">
        <Dropzone
          onFile={loadFile}
          accept="video/*"
          icon={VideoReplayIcon}
          label="Drop a video clip to turn into a GIF"
          hint="MP4 or WebM · keep it short for best results"
        />
      </div>
    )
  }

  const span = Math.max(0, end - start)
  const fileSizeKb = gifSize > 0 ? (gifSize / 1024).toFixed(0) : null

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:grid md:grid-cols-2 md:grid-rows-[1fr_auto] md:gap-6 md:p-6">
      <section className="flex min-h-0 flex-col gap-3 md:row-span-2">
        <div className="relative flex-1 overflow-hidden rounded-xl border bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              setDuration(d)
              const span = Math.min(d, MAX_DURATION_LIMIT, 6)
              setStart(0)
              setEnd(span)
              setMaxSpan(Math.min(d, MAX_DURATION_LIMIT))
            }}
            onClick={togglePlay}
          />
          <button
            type="button"
            onClick={togglePlay}
            className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-background"
            aria-label={playing ? "Pause" : "Play"}
          >
            <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} size={16} />
          </button>
        </div>
        <div className="space-y-2.5">
          <TrimSlider
            duration={duration}
            start={start}
            end={end}
            maxSpan={MAX_DURATION_LIMIT}
            onChange={(s, e) => {
              setStart(s)
              setEnd(e)
              const video = videoRef.current
              if (video) {
                video.pause()
                video.currentTime = s
                setPlaying(false)
              }
            }}
          />
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(start)}</span>
            <span>{span.toFixed(1)}s</span>
            <span>{formatTime(end)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{file.name}</span>
          <Button variant="ghost" size="sm" onClick={reset}>
            <HugeiconsIcon icon={Refresh01Icon} />
            Replace
          </Button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3 md:row-span-1">
        <div
          className={cn(
            "relative flex-1 overflow-hidden rounded-xl border",
            gifUrl ? "bg-black" : "bg-muted/40"
          )}
        >
          {gifUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gifUrl}
              alt="Generated GIF"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-background">
                <HugeiconsIcon
                  icon={Gif01Icon}
                  size={16}
                  strokeWidth={1.75}
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {working
                  ? `Rendering · ${Math.round(progress * 100)}%`
                  : "Your GIF will show up here"}
              </p>
              {working && (
                <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.max(4, progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <OptionGroup
            label="FPS"
            options={FPS_OPTIONS}
            value={fps}
            onChange={setFps}
          />
          <OptionGroup
            label="Width"
            options={WIDTH_OPTIONS}
            value={width}
            suffix="px"
            onChange={setWidth}
          />
          {fileSizeKb && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Output
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {fileSizeKb} KB
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {gifUrl && (
            <Button variant="outline" size="lg" onClick={download}>
              <HugeiconsIcon icon={Download01Icon} />
              Download
            </Button>
          )}
          <Button size="lg" onClick={generate} disabled={working || span <= 0}>
            {working ? "Rendering…" : gifUrl ? "Regenerate" : "Generate GIF"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function OptionGroup<T extends number>({
  label,
  options,
  value,
  onChange,
  suffix,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex h-7 items-center rounded-md bg-muted p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "h-full rounded-[5px] px-2 text-xs font-medium transition-colors",
              value === opt
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  )
}
