import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { tools, type Tool } from "@/lib/tools"
import { BeforeAfter } from "@/components/before-after"
import { RecentStrip } from "@/components/recent-strip"

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all",
        !tool.comingSoon &&
          "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-e3",
        tool.comingSoon && "opacity-80"
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: tool.hue }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: tool.hue }}
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in oklch, ${tool.hue} 14%, transparent)`,
            color: tool.hue,
          }}
        >
          <HugeiconsIcon icon={tool.icon} size={20} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight">
              {tool.name}
            </h3>
            {tool.comingSoon && (
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground/80 uppercase">
                Soon
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {tool.tagline}
          </p>
        </div>
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {tool.shortcut && (
              <kbd className="rounded border bg-background px-1 font-mono text-[9px]">
                ⌘{tool.shortcut}
              </kbd>
            )}
          </span>
          <span
            className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5"
            style={{ color: tool.comingSoon ? undefined : tool.hue }}
          >
            {tool.comingSoon ? "Peek" : "Open"}
            <HugeiconsIcon icon={ArrowRight02Icon} size={12} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  )
}

function VerticalPreviewCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-e3"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: tool.hue }}
      />
      <div className="flex items-center justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklch, ${tool.hue} 14%, transparent)`,
              color: tool.hue,
            }}
          >
            <HugeiconsIcon icon={tool.icon} size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              {tool.name}
            </h3>
            <p className="text-[13px] text-muted-foreground">{tool.tagline}</p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 text-[12px] transition-transform group-hover:translate-x-0.5"
          style={{ color: tool.hue }}
        >
          Open
          <HugeiconsIcon icon={ArrowRight02Icon} size={12} strokeWidth={2} />
        </span>
      </div>
      <div className="flex-1 p-5 pt-0">
        <BeforeAfter
          className="h-full min-h-[180px] w-full rounded-xl border bg-muted"
          before={
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted via-muted to-muted/80">
              <div className="flex h-[68%] w-[90%] items-center justify-center rounded-md bg-foreground/10 text-[10px] font-mono tracking-widest text-foreground/40 uppercase">
                16 : 9
              </div>
            </div>
          }
          after={
            <div className="flex h-full items-center justify-center bg-gradient-to-tr from-primary/20 via-background to-warm/15">
              <div className="flex h-[90%] w-[38%] items-center justify-center rounded-md bg-foreground/10 text-[10px] font-mono tracking-widest text-foreground/50 uppercase">
                9 : 16
              </div>
            </div>
          }
        />
      </div>
    </Link>
  )
}

export default function HomePage() {
  const live = tools.filter((t) => !t.comingSoon)
  const soon = tools.filter((t) => t.comingSoon)
  const vertical = live.find((t) => t.slug === "vertical")
  const others = live.filter((t) => t.slug !== "vertical")
  return (
    <div className="bg-mesh relative h-full overflow-y-auto">
      <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay" />
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-5 py-8 md:gap-8 md:px-8 md:py-12">
        <div className="space-y-2">
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            Clip it. Crop it. Post it.
          </h1>
          <p className="max-w-xl text-[14px] text-muted-foreground md:text-[15px]">
            A tiny toolbox for streamers. Reformat clips, cook emotes, and drop
            GIFs — in seconds.
          </p>
        </div>
        <RecentStrip />
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {vertical && (
            <div className="md:col-span-2 md:row-span-2">
              <VerticalPreviewCard tool={vertical} />
            </div>
          )}
          {others.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
        {soon.length > 0 && (
          <div className="space-y-3">
            <div className="font-mono text-[9px] tracking-widest text-muted-foreground/80 uppercase">
              Coming Soon
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {soon.map((t) => (
                <ToolCard key={t.slug} tool={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
