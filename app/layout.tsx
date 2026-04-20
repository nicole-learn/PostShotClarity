import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "PostShotClarity — clip it. crop it. post it.",
  description:
    "A tiny toolbox for streamers. Resize emotes, cut GIFs, and reframe clips for vertical in seconds.",
  openGraph: {
    title: "PostShotClarity",
    description: "clip it. crop it. post it.",
    type: "website",
  },
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
      </body>
    </html>
  )
}
