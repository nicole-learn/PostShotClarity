"use client"

import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Upload04Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type DropzoneProps = {
  onFile: (file: File) => void
  accept: string
  icon?: IconSvgElement
  label: string
  hint: string
  className?: string
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
        if (file) onFile(file)
      }}
      className={cn(
        "group relative flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-colors",
        dragging
          ? "border-primary/60 bg-primary/5"
          : "border-border hover:border-foreground/30 hover:bg-muted/40",
        className
      )}
    >
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
      <div className="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-muted/60">
        <HugeiconsIcon
          icon={icon}
          size={20}
          strokeWidth={1.75}
          className="text-muted-foreground"
        />
      </div>
      <div className="space-y-0.5 text-center">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </label>
  )
}
