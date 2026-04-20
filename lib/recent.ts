"use client"

const KEY = "psc:recent"
const MAX = 6

export type RecentItem = {
  tool: string
  name: string
  at: number
  size?: number
}

export function readRecent(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushRecent(item: Omit<RecentItem, "at">) {
  if (typeof window === "undefined") return
  try {
    const prev = readRecent()
    const next = [{ ...item, at: Date.now() }, ...prev].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}
