"use client"

import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Upload04Icon, Copy01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { useToast } from "@/components/toast"

type DropzoneProps = {
  onFile: (file: File) => void
  accept: string
  icon?: IconSvgElement
  label: string
  hint: string
  className?: string
}

function acceptMatches(file: File, accept: string) {
  const types = accept.split(",").map((s) => s.trim().toLowerCase())
  return types.some((t) => {
    if (t.endsWith("/*")) return file.type.startsWith(t.replace("/*", "/"))
    if (t.startsWith(".")) return file.name.toLowerCase().endsWith(t)
    return file.type === t
  })
}

export function Dropzone({
  onFile,
  accept,
  icon = Upload04Icon,
  label,
  hint,
  className,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const { push } = useToast()

  const handlePaste = React.useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file && acceptMatches(file, accept)) {
            onFile(file)
            push({ message: "Pasted from clipboard", variant: "success" })
            return
          }
        }
      }
    },
    [accept, onFile, push]
  )

  React.useEffect(() => {
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  return (
    <label
      htmlFor="dropzone-input"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        if (!acceptMatches(file, accept)) {
          push({
            message: "That file type isn't supported here",
            variant: "error",
          })
          return
        }
        onFile(file)
      }}
      className={cn(
        "group relative flex h-full w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl transition-colors",
        dragging
          ? "bg-primary/[0.06]"
          : "bg-background hover:bg-muted/40",
        className
      )}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="16"
          ry="16"
          fill="none"
          stroke={
            dragging
              ? "color-mix(in oklch, var(--primary) 70%, transparent)"
              : "var(--border)"
          }
          strokeWidth={dragging ? 2 : 1.25}
          strokeDasharray="8 6"
          className={cn(dragging && "dashed-drift")}
        />
      </svg>
      <input
        id="dropzone-input"
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ""
        }}
      />
      <div
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full transition-all",
          dragging
            ? "bg-primary/15 text-primary scale-110"
            : "bg-muted text-muted-foreground group-hover:bg-muted/60"
        )}
      >
        <HugeiconsIcon icon={icon} size={22} strokeWidth={1.75} />
        {dragging && (
          <span className="animate-ping absolute inset-0 rounded-full bg-primary/20" />
        )}
      </div>
      <div className="space-y-1 text-center">
        <div className="text-[15px] font-medium tracking-tight">
          {dragging ? "Release to drop" : label}
        </div>
        <div className="text-xs text-muted-foreground">
          {hint}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={Copy01Icon} size={11} strokeWidth={1.75} />
            paste
          </span>
        </div>
      </div>
    </label>
  )
}
