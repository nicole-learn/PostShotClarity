import type { Metadata } from "next"

import { CaptionsGenerator } from "./captions-generator"

export const metadata: Metadata = {
  title: "Free Auto Caption Generator for Stream Clips",
  description:
    "Add animated, auto-synced captions to your clips and short-form videos. Styled for TikTok, Reels, and YouTube Shorts — free, no watermark, no sign-up.",
  alternates: { canonical: "/captions" },
  openGraph: {
    title: "Free Auto Caption Generator for Stream Clips",
    description:
      "Animated, auto-synced captions for TikTok, Reels, and Shorts. Free, in-browser, no watermark.",
    url: "/captions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Auto Caption Generator · PostShotClarity",
    description:
      "Animated, auto-synced captions for short-form video. Free, no watermark.",
  },
}

export default function CaptionsPage() {
  return <CaptionsGenerator />
}
