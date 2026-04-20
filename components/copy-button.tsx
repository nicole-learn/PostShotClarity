"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        } catch {}
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
        copied
          ? "border-primary/40 bg-primary/5 text-primary"
          : "hover:bg-muted",
        className
      )}
    >
      <span className="relative inline-flex size-3.5">
        <HugeiconsIcon
          icon={Copy01Icon}
          size={14}
          strokeWidth={1.75}
          className={cn(
            "absolute inset-0 transition-all",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={14}
          strokeWidth={1.75}
          className={cn(
            "absolute inset-0 transition-all",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </span>
      {copied ? "Copied" : label}
    </button>
  )
}
