import type { Metadata } from "next"

import { VerticalEditor } from "./vertical-editor"

export const metadata: Metadata = {
  title: "Horizontal to Vertical Video Converter for Streamers",
  description:
    "Turn gaming clips and stream highlights into 9:16 vertical videos for TikTok, Instagram Reels, and YouTube Shorts. Position the crop, pin your webcam overlay, export in seconds. Free, no watermark, no sign-up.",
  alternates: { canonical: "/vertical" },
  openGraph: {
    title: "Horizontal to Vertical Video Converter for Streamers",
    description:
      "Reframe horizontal stream clips into 9:16 vertical videos for TikTok, Reels, and Shorts. Free, in-browser, no watermark.",
    url: "/vertical",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Horizontal to Vertical Video Converter · PostShotClarity",
    description:
      "Reframe horizontal stream clips into 9:16 vertical videos for TikTok, Reels, and Shorts. Free, no watermark.",
  },
}

export default function VerticalPage() {
  return <VerticalEditor />
}
