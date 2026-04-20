import Image from "next/image"

import { cn } from "@/lib/utils"

export function Logomark({
  className,
  size = 22,
}: {
  className?: string
  size?: number
}) {
  return (
    <Image
      src="/logo-square.png"
      alt="PostShotClarity"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 dark:invert", className)}
    />
  )
}

export function Wordmark({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logomark />
      <span className="truncate text-[14px] font-semibold tracking-tight">
        PostShotClarity
      </span>
    </div>
  )
}
