/** @type {import('next').NextConfig} */

// Site-wide hardening. The CSP is deliberately permissive in a few places
// because of real runtime needs:
//   - 'unsafe-inline'/'unsafe-eval' in script-src: Next.js + Remotion Player
//     evaluate inline bootstrap code and (in dev) use eval.
//   - 'wasm-unsafe-eval': @ffmpeg/ffmpeg runs in a Web Worker as wasm.
//   - blob: in media-src/worker-src/child-src: ffmpeg.wasm uses blob workers
//     and the player loads blob-URL media.
//   - https: img-src/media-src: renders come back as presigned S3 URLs.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "connect-src 'self' https: blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
]

const nextConfig = {
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // /gif/* hosts the ffmpeg.wasm GIF generator and needs
        // cross-origin isolation for SharedArrayBuffer.
        source: "/gif/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ]
  },
  async redirects() {
    return [{ source: "/", destination: "/vertical", permanent: false }]
  },
}

export default nextConfig
