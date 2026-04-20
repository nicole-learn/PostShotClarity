import type { CaptionLine, TranscribedWord } from "@/compositions/captions/types"

const MAX_WORDS_PER_LINE = 6
const MAX_DURATION_PER_LINE = 2.8
const MAX_GAP_WITHIN_LINE = 0.6

const SENTENCE_END = /[.!?]$/
const SOFT_BREAK = /[,;:—–]$/

/**
 * Turn a flat list of timestamped words into short, readable caption lines.
 * We break on sentence endings, long pauses, hard word caps, or duration caps.
 */
export function groupWordsIntoLines(words: TranscribedWord[]): CaptionLine[] {
  const lines: CaptionLine[] = []
  let bucket: TranscribedWord[] = []

  const flush = () => {
    if (bucket.length === 0) return
    const start = bucket[0].start
    const end = bucket[bucket.length - 1].end
    lines.push({
      id: `line-${lines.length}-${start.toFixed(3)}`,
      text: bucket.map((w) => w.word.trim()).join(" ").replace(/\s+/g, " ").trim(),
      start,
      end,
      words: bucket.map((w) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
      })),
    })
    bucket = []
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const prev = words[i - 1]
    const gap = prev ? w.start - prev.end : 0
    const lineStart = bucket[0]?.start ?? w.start
    const wouldDuration = w.end - lineStart

    if (
      bucket.length >= MAX_WORDS_PER_LINE ||
      wouldDuration > MAX_DURATION_PER_LINE ||
      (bucket.length > 0 && gap > MAX_GAP_WITHIN_LINE)
    ) {
      flush()
    }

    bucket.push(w)
    const raw = w.word.trim()
    const isHardBreak = SENTENCE_END.test(raw)
    const isSoftBreak = SOFT_BREAK.test(raw) && bucket.length >= 3
    if (isHardBreak || isSoftBreak) {
      flush()
    }
  }
  flush()

  return lines
}
