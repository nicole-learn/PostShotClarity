import Link from "next/link"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { ArrowRight02Icon } from "@hugeicons/core-free-icons"

import { tools } from "@/lib/tools"

export function ComingSoon({
  title,
  icon,
  description,
  slug,
}: {
  title: string
  icon: IconSvgElement
  description: string
  slug: string
}) {
  const liveTools = tools.filter((t) => !t.comingSoon)
  const tool = tools.find((t) => t.slug === slug)

  return (
    <div className="bg-mesh relative h-full overflow-y-auto">
      <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay" />
      <div className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div
          className="relative flex size-14 items-center justify-center rounded-2xl"
          style={{
            background: `color-mix(in oklch, ${tool?.hue ?? "var(--primary)"} 14%, transparent)`,
            color: tool?.hue ?? "var(--primary)",
          }}
        >
          <HugeiconsIcon icon={icon} size={22} strokeWidth={1.5} />
          <span
            className="absolute inset-0 rounded-2xl opacity-40 blur-xl"
            style={{ background: tool?.hue ?? "var(--primary)" }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl leading-tight tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="mt-2 w-full border-t pt-5">
          <div className="font-mono text-[9px] tracking-widest text-muted-foreground/80 uppercase">
            Try now
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {liveTools.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: t.hue }}
                />
                {t.name}
                <HugeiconsIcon
                  icon={ArrowRight02Icon}
                  size={11}
                  strokeWidth={2}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
