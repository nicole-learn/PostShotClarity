import {
  AspectRatioIcon,
  ClosedCaptionIcon,
  Gif01Icon,
  HappyIcon,
  LibraryIcon,
  MusicNote01Icon,
} from "@hugeicons/core-free-icons"

export type ToolCategory = "Video Editing" | "Streamer Tools"

export type Tool = {
  slug: string
  name: string
  short: string
  tagline: string
  blurb: string
  icon: typeof HappyIcon
  hue: string
  category: ToolCategory
  comingSoon?: boolean
  shortcut?: string
}

export const toolCategories: ToolCategory[] = [
  "Video Editing",
  "Streamer Tools",
]

export const tools: Tool[] = [
  {
    slug: "vertical",
    name: "Go Vertical",
    short: "Vertical",
    tagline: "Reframe horizontal clips for TikTok and Reels.",
    blurb: "Reframe a horizontal clip for TikTok and Reels.",
    icon: AspectRatioIcon,
    hue: "var(--tool-vertical)",
    category: "Video Editing",
    shortcut: "1",
  },
  {
    slug: "captions",
    name: "Caption Generator",
    short: "Captions",
    tagline: "Auto-caption clips with clean, editable text.",
    blurb: "Generate editable captions for any clip.",
    icon: ClosedCaptionIcon,
    hue: "var(--tool-captions)",
    category: "Video Editing",
    shortcut: "2",
  },
  {
    slug: "meme-sounds",
    name: "Add Meme Sounds",
    short: "Sounds",
    tagline: "Drop meme sounds onto your clip.",
    blurb: "Layer meme sounds onto any clip.",
    icon: MusicNote01Icon,
    hue: "var(--tool-sounds)",
    category: "Video Editing",
    shortcut: "3",
  },
  {
    slug: "meme-library",
    name: "Meme Library",
    short: "Library",
    tagline: "Browse and download reaction memes.",
    blurb: "Browse and download reaction memes.",
    icon: LibraryIcon,
    hue: "var(--tool-library)",
    category: "Video Editing",
    shortcut: "4",
  },
  {
    slug: "emotes",
    name: "Emote Cooker",
    short: "Emotes",
    tagline: "One image in. Every emote size out.",
    blurb: "Resize one image into every emote size.",
    icon: HappyIcon,
    hue: "var(--tool-emotes)",
    category: "Streamer Tools",
    shortcut: "5",
  },
  {
    slug: "gif",
    name: "GIF Factory",
    short: "GIF",
    tagline: "Trim a clip. Drop a GIF.",
    blurb: "Trim a short clip and export it as a GIF.",
    icon: Gif01Icon,
    hue: "var(--tool-gif)",
    category: "Streamer Tools",
    shortcut: "6",
  },
]

export function findTool(slug: string) {
  return tools.find((t) => t.slug === slug)
}
