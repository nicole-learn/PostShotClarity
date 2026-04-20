import type { MetadataRoute } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://postshotclarity.com"

const ROUTES: Array<{
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
}> = [
  { path: "/vertical", priority: 1.0, changeFrequency: "weekly" },
  { path: "/captions", priority: 0.9, changeFrequency: "weekly" },
  { path: "/gif", priority: 0.8, changeFrequency: "weekly" },
  { path: "/emotes", priority: 0.8, changeFrequency: "weekly" },
  { path: "/meme-sounds", priority: 0.7, changeFrequency: "weekly" },
  { path: "/meme-library", priority: 0.7, changeFrequency: "weekly" },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
