"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FavouriteIcon,
  Menu01Icon,
  Moon02Icon,
  Sun03Icon,
  Cancel01Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { tools } from "@/lib/tools"
import { Logomark, Wordmark } from "@/components/logo"

const SUPPORT_URL = "https://www.nic0le.com/tips"
const COLLAPSE_KEY = "psc:sidebar-collapsed"

function useCollapsed() {
  const [collapsed, setCollapsed] = React.useState(false)
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "1") setCollapsed(true)
    } catch {}
  }, [])
  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])
  return [collapsed, toggle] as const
}

function IconBtn({
  onClick,
  href,
  label,
  icon,
}: {
  onClick?: () => void
  href?: string
  label: string
  icon: typeof FavouriteIcon
}) {
  const cls =
    "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
        className={cls}
      >
        <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} />
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cls}
    >
      <HugeiconsIcon icon={icon} size={15} strokeWidth={1.75} />
    </button>
  )
}

function useMounted() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  return mounted
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"
  return (
    <IconBtn
      onClick={() => setTheme(isDark ? "light" : "dark")}
      label={isDark ? "Light mode" : "Dark mode"}
      icon={isDark ? Sun03Icon : Moon02Icon}
    />
  )
}

function NavSection({
  label,
  collapsed,
  children,
}: {
  label: string
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      {!collapsed && (
        <div className="px-2.5 pt-3 pb-1 font-mono text-[9px] tracking-widest text-muted-foreground/70 uppercase">
          {label}
        </div>
      )}
      {collapsed && <div className="-mx-2 mt-2 mb-1 h-px bg-border/60" />}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  tool,
  active,
  collapsed,
  onNavigate,
}: {
  tool: (typeof tools)[number]
  active: boolean
  collapsed: boolean
  onNavigate?: () => void
}) {
  const href = `/${tool.slug}`
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? `${tool.name}  ⌘${tool.shortcut}` : undefined}
      className={cn(
        "group flex h-9 items-center rounded-md text-[13px] transition-colors",
        collapsed ? "size-9 justify-center px-0" : "gap-2.5 px-2.5",
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
          "shrink-0 transition-colors",
          active ? "" : "text-muted-foreground group-hover:text-foreground"
        )}
        style={active ? { color: tool.hue } : undefined}
      />
      {!collapsed && (
        <>
          <span className="truncate">{tool.name}</span>
          {tool.comingSoon && (
            <span className="ml-auto font-mono text-[9px] tracking-wider text-muted-foreground/70 uppercase">
              Soon
            </span>
          )}
        </>
      )}
    </Link>
  )
}

function NavItems({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const live = tools.filter((t) => !t.comingSoon)
  const soon = tools.filter((t) => t.comingSoon)
  return (
    <nav className="flex flex-col">
      <NavSection label="Tools" collapsed={collapsed}>
        {live.map((tool) => (
          <NavItem
            key={tool.slug}
            tool={tool}
            collapsed={collapsed}
            active={pathname === `/${tool.slug}`}
            onNavigate={onNavigate}
          />
        ))}
      </NavSection>
      {soon.length > 0 && (
        <NavSection label="Coming Soon" collapsed={collapsed}>
          {soon.map((tool) => (
            <NavItem
              key={tool.slug}
              tool={tool}
              collapsed={collapsed}
              active={pathname === `/${tool.slug}`}
              onNavigate={onNavigate}
            />
          ))}
        </NavSection>
      )}
    </nav>
  )
}

function SidebarInner({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-14 items-center",
          collapsed ? "justify-center px-0" : "px-3"
        )}
      >
        {collapsed ? (
          <Link href="/" onClick={onNavigate} aria-label="PostShotClarity">
            <Logomark size={22} />
          </Link>
        ) : (
          <Link href="/" onClick={onNavigate} className="min-w-0">
            <Wordmark />
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <NavItems collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <div
        className={cn(
          "flex gap-1 border-t px-2 py-2",
          collapsed
            ? "flex-col items-center"
            : "items-center justify-between"
        )}
      >
        <IconBtn href={SUPPORT_URL} label="Support" icon={FavouriteIcon} />
        <ThemeToggle />
        {onToggleCollapse && (
          <IconBtn
            onClick={onToggleCollapse}
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            icon={collapsed ? SidebarRightIcon : SidebarLeftIcon}
          />
        )}
      </div>
    </div>
  )
}

export function Sidebar() {
  const [collapsed, toggleCollapsed] = useCollapsed()
  const router = useRouter()

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const t = tools.find(
        (x) => x.shortcut === e.key && !x.comingSoon && x.shortcut
      )
      if (!t) return
      e.preventDefault()
      router.push(`/${t.slug}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  return (
    <aside
      className={cn(
        "glass hidden shrink-0 border-r md:block",
        collapsed ? "w-14" : "w-52"
      )}
    >
      <SidebarInner collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
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
      <header className="glass flex h-14 items-center justify-between border-b px-4 md:hidden">
        <Link href="/" className="min-w-0">
          <Wordmark />
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
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] border-l bg-sidebar shadow-e4">
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark />
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
              <NavItems collapsed={false} onNavigate={() => setOpen(false)} />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 border-t px-2 py-2">
              <IconBtn href={SUPPORT_URL} label="Support" icon={FavouriteIcon} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
