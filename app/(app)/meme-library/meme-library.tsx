"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import memeScreens from "@/meme-screens.json"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"

type RawItem = { name: string; url: string }
type MemeItem = RawItem & {
  category: string
  label: string
  isVideo: boolean
  ext: string
}

const raw = memeScreens as Record<string, RawItem[]>
const categories = Object.keys(raw)

function prettify(slug: string) {
  return slug
    .split("-")
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

const allMemes: MemeItem[] = Object.entries(raw).flatMap(([category, items]) =>
  items.map<MemeItem>((it) => {
    const ext = (it.url.split(".").pop() || "mp4").toLowerCase()
    return {
      ...it,
      category,
      label: prettify(it.name),
      isVideo:
        ext !== "webp" &&
        ext !== "png" &&
        ext !== "jpg" &&
        ext !== "jpeg" &&
        ext !== "gif",
      ext,
    }
  })
)

export function MemeLibrary() {
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null)
  const [downloadingUrl, setDownloadingUrl] = React.useState<string | null>(null)
  const { push } = useToast()

  const filtered = React.useMemo(() => {
    if (!selectedCat) return allMemes
    return allMemes.filter((m) => m.category === selectedCat)
  }, [selectedCat])

  const download = async (meme: MemeItem) => {
    if (downloadingUrl) return
    setDownloadingUrl(meme.url)
    try {
      const res = await fetch(meme.url)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `${meme.name}.${meme.ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch {
      push({ message: "Download failed — try again", variant: "error" })
    } finally {
      setDownloadingUrl(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:grid md:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="shrink-0 overflow-hidden border-b md:min-h-0 md:border-r md:border-b-0">
        <nav
          className="flex gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] md:h-full md:flex-col md:gap-0.5 md:overflow-x-visible md:overflow-y-auto md:overscroll-contain md:px-2 md:py-3 [&::-webkit-scrollbar]:hidden"
          aria-label="Meme categories"
        >
          <CatTab
            active={selectedCat === null}
            count={allMemes.length}
            onClick={() => setSelectedCat(null)}
          >
            All
          </CatTab>
          {categories.map((c) => (
            <CatTab
              key={c}
              active={selectedCat === c}
              count={raw[c].length}
              onClick={() => setSelectedCat(c)}
            >
              {c}
            </CatTab>
          ))}
        </nav>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {filtered.map((m) => (
            <MemeTile
              key={m.url}
              meme={m}
              downloading={downloadingUrl === m.url}
              onDownload={() => download(m)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CatTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-md text-[12px] transition-colors",
        "px-2.5 py-1.5 whitespace-nowrap",
        "md:w-full",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className="truncate">{children}</span>
      <span
        className={cn(
          "font-mono text-[9px] tnum",
          active ? "text-muted-foreground" : "text-muted-foreground/60"
        )}
      >
        {count}
      </span>
    </button>
  )
}

function MemeTile({
  meme,
  downloading,
  onDownload,
}: {
  meme: MemeItem
  downloading: boolean
  onDownload: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const wrapRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!meme.isVideo) return
    const video = videoRef.current
    const wrap = wrapRef.current
    if (!video || !wrap) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [meme.isVideo])

  return (
    <button
      ref={wrapRef}
      type="button"
      onClick={onDownload}
      disabled={downloading}
      title={`Download ${meme.label}`}
      aria-label={`Download ${meme.label}`}
      className="group relative aspect-square w-full overflow-hidden rounded-lg border bg-muted disabled:pointer-events-none"
    >
      {meme.isVideo ? (
        <video
          ref={videoRef}
          src={meme.url}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={meme.url}
          alt={meme.label}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <span className="pointer-events-none absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-white text-neutral-900 opacity-0 shadow-e1 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {downloading ? (
          <span className="size-2.5 animate-pulse rounded-full bg-neutral-900/60" />
        ) : (
          <HugeiconsIcon icon={Download01Icon} size={11} strokeWidth={2} />
        )}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pt-8 pb-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="block truncate text-left text-[11px] font-medium text-white">
          {meme.label}
        </span>
      </div>
    </button>
  )
}
