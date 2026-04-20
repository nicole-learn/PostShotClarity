"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LifebuoyIcon,
  Menu01Icon,
  Moon02Icon,
  Sun03Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { tools } from "@/lib/tools"

const SUPPORT_URL = "https://www.nic0le.com/tips"

function SupportButton() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon icon={LifebuoyIcon} size={16} strokeWidth={1.75} />
      Support
    </a>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex h-9 w-full items-center rounded-md bg-muted/60 p-0.5 text-[13px] transition-colors"
    >
      <span
        className={cn(
          "flex h-full flex-1 items-center justify-center gap-1.5 rounded-[5px] transition-colors",
          !isDark && "bg-background shadow-sm",
          isDark && "text-muted-foreground"
        )}
      >
        <HugeiconsIcon icon={Sun03Icon} size={14} strokeWidth={1.75} />
        Light
      </span>
      <span
        className={cn(
          "flex h-full flex-1 items-center justify-center gap-1.5 rounded-[5px] transition-colors",
          isDark && "bg-background shadow-sm",
          !isDark && "text-muted-foreground"
        )}
      >
        <HugeiconsIcon icon={Moon02Icon} size={14} strokeWidth={1.75} />
        Dark
      </span>
    </button>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5">
      {tools.map((tool) => {
        const href = `/${tool.slug}`
        const active = pathname === href
        return (
          <Link
            key={tool.slug}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <HugeiconsIcon
              icon={tool.icon}
              size={16}
              strokeWidth={1.75}
              className={cn(
                "shrink-0",
                active
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="truncate">{tool.name}</span>
            {tool.comingSoon && (
              <span className="ml-auto text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                Soon
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-[15px] font-semibold tracking-tight"
        >
          PostShotClarity
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <NavItems onNavigate={onNavigate} />
      </div>
      <div className="flex flex-col gap-1.5 border-t p-2">
        <SupportButton />
        <ThemeToggle />
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
      <SidebarInner />
    </aside>
  )
}

export function MobileTopBar() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const current = tools.find((t) => pathname === `/${t.slug}`)

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          PostShotClarity
        </Link>
        <div className="flex items-center gap-3">
          {current && (
            <span className="text-[13px] text-muted-foreground">
              {current.short}
            </span>
          )}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <HugeiconsIcon icon={Menu01Icon} size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] border-l bg-sidebar">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-[15px] font-semibold tracking-tight">
                PostShotClarity
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={1.75}
                />
              </button>
            </div>
            <div className="px-2">
              <NavItems onNavigate={() => setOpen(false)} />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 border-t p-2">
              <SupportButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
