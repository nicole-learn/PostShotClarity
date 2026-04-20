import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

export function ComingSoon({
  title,
  icon,
  description,
}: {
  title: string
  icon: IconSvgElement
  description: string
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            icon={icon}
            size={24}
            strokeWidth={1.5}
            className="text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-medium tracking-tight">{title}</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Coming soon
        </span>
      </div>
    </div>
  )
}
