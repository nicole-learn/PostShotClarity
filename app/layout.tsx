import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter, Instrument_Serif } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/toast"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
})

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
  preload: false,
})

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://postshotclarity.com"

const SITE_DESCRIPTION =
  "PostShotClarity is a free, in-browser toolkit for streamers and content creators. Reframe horizontal stream clips into 9:16 vertical videos for TikTok, Instagram Reels, and YouTube Shorts — plus auto-captions, GIFs, Twitch emotes, and meme sounds. No sign-up, no watermark."

const SITE_TAGLINE =
  "PostShotClarity — Free Clip-to-Vertical Video Toolkit for Streamers"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TAGLINE,
    template: "%s · PostShotClarity",
  },
  description: SITE_DESCRIPTION,
  applicationName: "PostShotClarity",
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  keywords: [
    "PostShotClarity",
    "clip to vertical",
    "horizontal to vertical video",
    "free vertical video maker",
    "TikTok clip maker",
    "Instagram Reels from stream clips",
    "YouTube Shorts editor",
    "Twitch clip to TikTok",
    "repurpose stream clips",
    "short form video tool",
    "streamer tools",
    "content creator tools",
    "auto caption generator",
    "Twitch emote formatter",
    "clip to GIF generator",
    "meme sound editor",
    "9:16 video crop",
  ],
  authors: [{ name: "PostShotClarity", url: SITE_URL }],
  creator: "PostShotClarity",
  publisher: "PostShotClarity",
  category: "Video Editing",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "PostShotClarity",
    title: SITE_TAGLINE,
    description:
      "Repurpose your stream clips into short-form vertical videos for TikTok, Reels, and Shorts. Free, in-browser, no watermark.",
    locale: "en_US",
    images: [
      {
        url: "/logo-square.png",
        width: 1024,
        height: 1024,
        alt: "PostShotClarity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TAGLINE,
    description:
      "Repurpose your stream clips into short-form vertical videos for TikTok, Reels, and Shorts. Free, in-browser, no watermark.",
    images: ["/logo-square.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "PostShotClarity",
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#app`,
      name: "PostShotClarity",
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      browserRequirements: "Requires a modern browser with WebAssembly support.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Horizontal-to-vertical 9:16 clip reframer",
        "Auto-synced animated captions",
        "Twitch emote sizer",
        "Clip-to-GIF generator",
        "Meme sound editor",
        "Meme library",
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        inter.variable,
        instrument.variable,
        "font-sans"
      )}
    >
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  )
}
