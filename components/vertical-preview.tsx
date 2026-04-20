"use client"

import * as React from "react"

import type { Rect } from "@/compositions/types"

type Props = {
  videoUrl: string
  sourceWidth: number
  sourceHeight: number
  mainCrop: Rect
  webcam: {
    enabled: boolean
    source: Rect
    placement: Rect
    radius: number
    shape: "rect" | "circle"
  }
  background: string
  /** Left-side source video. We draw straight from its decoded frames. */
  sharedSrcRef: React.RefObject<HTMLVideoElement | null>
}

/**
 * Canvas-based live preview. Every frame is drawn by:
 *
 *   ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)
 *
 * where (sx, sy, sw, sh) are the exact source pixels of the crop rect and
 * (dx, dy, dw, dh) are their destination on the canvas. This bypasses every
 * CSS edge case (object-fit, percentage containing blocks, ancestor
 * transforms) and is guaranteed to show *exactly* the pixels you selected
 * with no offset.
 */
export function VerticalPreview({
  videoUrl,
  sourceWidth,
  sourceHeight,
  mainCrop,
  webcam,
  background,
  sharedSrcRef,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  // Keep all live props in a ref so the rAF loop always reads the latest
  // values without being restarted.
  const stateRef = React.useRef({
    sourceWidth,
    sourceHeight,
    mainCrop,
    webcam,
    background,
  })
  React.useLayoutEffect(() => {
    stateRef.current = {
      sourceWidth,
      sourceHeight,
      mainCrop,
      webcam,
      background,
    }
  })

  React.useEffect(() => {
    let raf = 0
    const canvas = canvasRef.current
    const videoEl = sharedSrcRef.current
    if (!canvas || !videoEl) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvasIfNeeded = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const cw = Math.max(1, Math.round(rect.width * dpr))
      const ch = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      return { cw, ch }
    }

    const render = () => {
      const { sourceWidth, sourceHeight, mainCrop, webcam, background } =
        stateRef.current

      const { cw, ch } = resizeCanvasIfNeeded()

      ctx.fillStyle = background
      ctx.fillRect(0, 0, cw, ch)

      const ready =
        videoEl.readyState >= 2 &&
        sourceWidth > 0 &&
        sourceHeight > 0 &&
        mainCrop.width > 0 &&
        mainCrop.height > 0

      if (ready) {
        // Main crop: "contain" fit so the whole selection is always visible,
        // centered. If the selection is 9:16 (it is, via aspect-lock) this
        // fills the canvas exactly with no bars and no clipping.
        const sx = mainCrop.x * sourceWidth
        const sy = mainCrop.y * sourceHeight
        const sw = mainCrop.width * sourceWidth
        const sh = mainCrop.height * sourceHeight
        const scale = Math.min(cw / sw, ch / sh)
        const dw = sw * scale
        const dh = sh * scale
        const dx = (cw - dw) / 2
        const dy = (ch - dh) / 2

        try {
          ctx.drawImage(videoEl, sx, sy, sw, sh, dx, dy, dw, dh)
        } catch {
          // A decoder hiccup can throw; skip this frame.
        }

        if (
          webcam.enabled &&
          webcam.source.width > 0 &&
          webcam.source.height > 0
        ) {
          const px = webcam.placement.x * cw
          const py = webcam.placement.y * ch
          const pw = webcam.placement.width * cw
          const ph = webcam.placement.height * ch

          const wsx = webcam.source.x * sourceWidth
          const wsy = webcam.source.y * sourceHeight
          const wsw = webcam.source.width * sourceWidth
          const wsh = webcam.source.height * sourceHeight

          const wscale = Math.min(pw / wsw, ph / wsh)
          const wdw = wsw * wscale
          const wdh = wsh * wscale
          const wdx = px + (pw - wdw) / 2
          const wdy = py + (ph - wdh) / 2

          ctx.save()
          if (webcam.shape === "circle") {
            ctx.beginPath()
            ctx.ellipse(
              px + pw / 2,
              py + ph / 2,
              pw / 2,
              ph / 2,
              0,
              0,
              Math.PI * 2
            )
            ctx.closePath()
          } else {
            const radius = Math.max(0, Math.min(pw, ph, webcam.radius))
            roundRectPath(ctx, px, py, pw, ph, radius)
          }
          ctx.clip()
          try {
            ctx.drawImage(videoEl, wsx, wsy, wsw, wsh, wdx, wdy, wdw, wdh)
          } catch {
            // ignore
          }
          ctx.restore()
        }
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [sharedSrcRef, videoUrl])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      style={{ display: "block", background }}
    />
  )
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
