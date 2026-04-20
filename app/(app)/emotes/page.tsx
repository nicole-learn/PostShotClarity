import type { Metadata } from "next"

import { EmotesFormatter } from "./emotes-formatter"

export const metadata: Metadata = {
  title: "Twitch Emote Formatter & Sizer",
  description:
    "Upload an image and instantly get every emote size needed for Twitch, Discord, and YouTube. Free, in-browser, nothing uploaded to a server.",
  alternates: { canonical: "/emotes" },
  openGraph: {
    title: "Twitch Emote Formatter & Sizer",
    description:
      "Generate every Twitch, Discord, and YouTube emote size from one image. Free and in-browser.",
    url: "/emotes",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Twitch Emote Formatter · PostShotClarity",
    description:
      "Every Twitch / Discord / YouTube emote size from one upload. Free.",
  },
}

export default function EmotesPage() {
  return <EmotesFormatter />
}
