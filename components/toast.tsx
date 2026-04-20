"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  AlertCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type ToastVariant = "info" | "success" | "error"

type Toast = {
  id: number
  message: string
  variant: ToastVariant
  action?: { label: string; onClick: () => void }
  duration: number
}

type Input = Omit<Toast, "id" | "duration"> & { duration?: number }

type Ctx = {
  push: (t: Input) => number
  dismiss: (id: number) => void
}

const ToastCtx = React.createContext<Ctx | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastCtx)
  if (!ctx) throw new Error("useToast must be inside ToastProvider")
  return ctx
}

let idCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: number) => {
    setToasts((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const push = React.useCallback(
    (t: Input) => {
      const id = ++idCounter
      const duration = t.duration ?? 4500
      setToasts((xs) => [...xs, { ...t, id, duration }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icon =
    toast.variant === "success"
      ? CheckmarkCircle02Icon
      : toast.variant === "error"
        ? AlertCircleIcon
        : InformationCircleIcon
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border bg-popover px-3 py-2.5 text-[13px] shadow-e3 animate-page-in",
        toast.variant === "error" && "border-destructive/30"
      )}
    >
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.75}
        className={cn(
          "shrink-0",
          toast.variant === "success" && "text-primary",
          toast.variant === "error" && "text-destructive",
          toast.variant === "info" && "text-muted-foreground"
        )}
      />
      <span className="flex-1 truncate">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-muted"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.75} />
      </button>
    </div>
  )
}
