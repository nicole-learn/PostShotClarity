import type { Metadata } from "next"

import { GifGenerator } from "./gif-generator"

export const metadata: Metadata = {
  title: "Clip to GIF Generator",
  description:
    "Turn short video clips into optimized GIFs right in your browser. Trim, preview, and export — free, no uploads, no watermark.",
  alternates: { canonical: "/gif" },
  openGraph: {
    title: "Clip to GIF Generator",
    description:
      "Convert stream clips into optimized GIFs in your browser. Free, no watermark.",
    url: "/gif",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clip to GIF Generator · PostShotClarity",
    description:
      "Turn clips into optimized GIFs right in your browser. Free.",
  },
}

export default function GifPage() {
  return <GifGenerator />
}
