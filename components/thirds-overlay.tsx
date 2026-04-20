import { cn } from "@/lib/utils"


export function ThirdsOverlay({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      preserveAspectRatio="none"
      viewBox="0 0 90 160"
    >
      <g
        stroke="color-mix(in oklch, white 80%, transparent)"
        strokeWidth="0.25"
        strokeDasharray="1.2 1.2"
      >
        <line x1="30" y1="0" x2="30" y2="160" />
        <line x1="60" y1="0" x2="60" y2="160" />
        <line x1="0" y1="53.3" x2="90" y2="53.3" />
        <line x1="0" y1="106.6" x2="90" y2="106.6" />
      </g>
    </svg>
  )
}
