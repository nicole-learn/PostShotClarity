import type { Metadata } from "next"

import { MemeLibrary } from "./meme-library"

export const metadata: Metadata = {
  title: "Meme Library for Streamers",
  description:
    "Browse and grab popular meme screens and reaction clips to drop into your short-form edits. Free, updated for streamers and content creators.",
  alternates: { canonical: "/meme-library" },
  openGraph: {
    title: "Meme Library for Streamers",
    description:
      "Popular meme screens and reaction clips, ready to drop into your edits. Free.",
    url: "/meme-library",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meme Library · PostShotClarity",
    description:
      "Meme screens and reaction clips for your short-form edits. Free.",
  },
}

export default function MemeLibraryPage() {
  return <MemeLibrary />
}
