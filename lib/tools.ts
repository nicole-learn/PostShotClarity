import {
  AspectRatioIcon,
  Film01Icon,
  Gif01Icon,
  HappyIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

export type Tool = {
  slug: string
  name: string
  short: string
  blurb: string
  icon: typeof HappyIcon
  comingSoon?: boolean
}

export const tools: Tool[] = [
  {
    slug: "emotes",
    name: "Emotes Formatter",
    short: "Emotes",
    blurb: "Resize one image into every emote size.",
    icon: HappyIcon,
  },
  {
    slug: "gif",
    name: "GIF Generator",
    short: "GIF",
    blurb: "Trim a short clip and export it as a GIF.",
    icon: Gif01Icon,
  },
  {
    slug: "vertical",
    name: "Horizontal to Vertical",
    short: "Vertical",
    blurb: "Reframe a horizontal clip for TikTok and Reels.",
    icon: AspectRatioIcon,
  },
  {
    slug: "clips",
    name: "Clip Searching",
    short: "Clips",
    blurb: "Coming soon.",
    icon: Search01Icon,
    comingSoon: true,
  },
  {
    slug: "reels",
    name: "Reel Editing",
    short: "Reels",
    blurb: "Coming soon.",
    icon: Film01Icon,
    comingSoon: true,
  },
]

export function findTool(slug: string) {
  return tools.find((t) => t.slug === slug)
}
