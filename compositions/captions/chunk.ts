import type { CaptionLine, TranscribedWord } from "./types"

export type CaptionChunk = {
  id: string
  text: string
  start: number
  end: number
  words: TranscribedWord[]
  /** Index of this chunk within its parent line, for animation keying. */
  indexInLine: number
}

/**
 * Expand transcribed lines into on-screen chunks. When `maxWords` is 0, each
 * caption line renders as one chunk. When set, each line is split into
 * sequential chunks of up to `maxWords` words. Each chunk's end is stretched
 * to the *next* chunk's start so there is no visual gap between them — this
 * mirrors how TikTok-style captions stay on screen until the next group
 * takes over.
 */
export function chunkLines(
  lines: CaptionLine[],
  maxWords: number
): CaptionChunk[] {
  const out: CaptionChunk[] = []
  for (const line of lines) {
    if (!maxWords || maxWords <= 0) {
      out.push({
        id: `${line.id}-0`,
        text: line.text,
        start: line.start,
        end: line.end,
        words: line.words,
        indexInLine: 0,
      })
      continue
    }

    const tokens = line.text.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue

    const duration = Math.max(0.05, line.end - line.start)
    const origJoined = line.words
      .map((w) => w.word.trim())
      .join(" ")
      .trim()
    const curJoined = tokens.join(" ")
    const matches =
      origJoined === curJoined && line.words.length === tokens.length

    type Pending = {
      slice: string[]
      wordTimings: TranscribedWord[]
      start: number
      lastEnd: number
    }
    const pending: Pending[] = []

    for (let i = 0, idx = 0; i < tokens.length; i += maxWords, idx++) {
      const slice = tokens.slice(i, i + maxWords)
      let start: number
      let lastEnd: number
      let wordTimings: TranscribedWord[]

      if (matches) {
        const origSlice = line.words.slice(i, i + maxWords)
        start = origSlice[0].start
        lastEnd = origSlice[origSlice.length - 1].end
        wordTimings = origSlice.map((w, j) => ({
          word: slice[j],
          start: w.start,
          end: w.end,
        }))
      } else {
        const perToken = duration / tokens.length
        start = line.start + i * perToken
        lastEnd = line.start + (i + slice.length) * perToken
        wordTimings = slice.map((w, j) => ({
          word: w,
          start: line.start + (i + j) * perToken,
          end: line.start + (i + j + 1) * perToken,
        }))
      }

      pending.push({ slice, wordTimings, start, lastEnd })
    }

    for (let k = 0; k < pending.length; k++) {
      const p = pending[k]
      const nextStart = pending[k + 1]?.start ?? line.end
      // Hold the chunk on screen until the next chunk takes over.
      const end = Math.max(p.lastEnd, nextStart)
      out.push({
        id: `${line.id}-${k}`,
        text: p.slice.join(" "),
        start: p.start,
        end,
        words: p.wordTimings,
        indexInLine: k,
      })
    }
  }
  return out
}
