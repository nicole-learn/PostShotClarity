import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostShotClarity",
    short_name: "PostShotClarity",
    description:
      "Free in-browser toolkit for streamers to repurpose stream clips into 9:16 vertical videos for TikTok, Reels, and Shorts.",
    start_url: "/vertical",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["video", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-square.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
