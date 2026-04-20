import type { Metadata } from "next"

import { MemeSoundsEditor } from "./meme-sounds-editor"

export const metadata: Metadata = {
  title: "Meme Sound Editor for Clips",
  description:
    "Drop classic meme sounds — vine boom, bruh, gunshot, rizz, and more — onto your stream clips. Free, in-browser, no watermark.",
  alternates: { canonical: "/meme-sounds" },
  openGraph: {
    title: "Meme Sound Editor for Clips",
    description:
      "Add meme sound effects to your stream clips. Free, in-browser, no watermark.",
    url: "/meme-sounds",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meme Sound Editor · PostShotClarity",
    description:
      "Vine boom, bruh, rizz, and more — drop them into your clips. Free.",
  },
}

export default function MemeSoundsPage() {
  return <MemeSoundsEditor />
}
