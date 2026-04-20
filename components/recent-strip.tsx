"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon } from "@hugeicons/core-free-icons"

import { tools } from "@/lib/tools"
import { readRecent, type RecentItem } from "@/lib/recent"

function relativeTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function RecentStrip() {
  const [items, setItems] = React.useState<RecentItem[]>([])
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readRecent())
  }, [])
  if (items.length === 0) return null
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-muted-foreground/80 uppercase">
        <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.75} />
        Recent
      </span>
      {items.map((it, i) => {
        const tool = tools.find((t) => t.slug === it.tool)
        if (!tool) return null
        return (
          <Link
            key={`${it.at}-${i}`}
            href={`/${it.tool}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: tool.hue }}
            />
            <span className="max-w-[120px] truncate">{it.name}</span>
            <span className="text-muted-foreground/60">
              {relativeTime(it.at)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
