import { cn } from "@/lib/utils"

type Stage = { label: string; weight?: number }

type Props = {
  stages: Stage[]
  currentIndex: number
  progressInStage: number
  className?: string
}

export function StagedProgress({
  stages,
  currentIndex,
  progressInStage,
  className,
}: Props) {
  const totalWeight = stages.reduce((acc, s) => acc + (s.weight ?? 1), 0)
  const completedWeight = stages
    .slice(0, Math.max(0, currentIndex))
    .reduce((acc, s) => acc + (s.weight ?? 1), 0)
  const currentWeight = stages[currentIndex]?.weight ?? 1
  const pct =
    ((completedWeight + currentWeight * Math.max(0, Math.min(1, progressInStage))) /
      totalWeight) *
    100
  const currentLabel = stages[currentIndex]?.label ?? stages[stages.length - 1]?.label

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{currentLabel}</span>
        <span className="tnum">{Math.round(pct)}%</span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  )
}
