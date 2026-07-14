import type { CaptionLine, TranscribedWord } from "./types"

export type CaptionChunk = {
  id: string
  text: string
  start: number
  end: number
  words: TranscribedWord[]
  indexInLine: number
}

/**
 * Rescale ASR word timings so they fit exactly inside `[line.start, line.end]`.
 * The UI lets users edit line.start/line.end without touching line.words, so
 * without this the chunks would keep showing at the original ASR timings and
 * ignore the user's edits in the right-hand captions panel.
 */
function rescaleWordsToLine(
  words: TranscribedWord[],
  line: CaptionLine
): TranscribedWord[] {
  if (words.length === 0) return words
  const origStart = words[0].start
  const origEnd = words[words.length - 1].end
  const origSpan = origEnd - origStart
  const newSpan = Math.max(0.01, line.end - line.start)
  if (origSpan <= 0.001) {
    const per = newSpan / words.length
    return words.map((w, i) => ({
      ...w,
      start: line.start + i * per,
      end: line.start + (i + 1) * per,
    }))
  }
  const rescale = (t: number) =>
    line.start + ((t - origStart) / origSpan) * newSpan
  return words.map((w) => ({
    ...w,
    start: rescale(w.start),
    end: rescale(w.end),
  }))
}

/**
 * Make the timed words reflect the editable line text. Pop and Karaoke render
 * `chunk.words` rather than `chunk.text`, so keeping the original ASR words
 * here would make right-panel edits invisible in those preview styles.
 */
function wordsForLineText(line: CaptionLine): TranscribedWord[] {
  const tokens = line.text.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const rescaled = rescaleWordsToLine(line.words, line)
  if (rescaled.length === tokens.length) {
    return tokens.map((word, index) => ({
      word,
      start: rescaled[index].start,
      end: rescaled[index].end,
    }))
  }

  // If an edit adds or removes words, distribute the new tokens across the
  // line's existing time span. This keeps the preview and exported animation
  // usable without pretending the old word-level alignment is still valid.
  const duration = Math.max(0.05, line.end - line.start)
  const perToken = duration / tokens.length
  return tokens.map((word, index) => ({
    word,
    start: line.start + index * perToken,
    end: line.start + (index + 1) * perToken,
  }))
}

/**
 * Pack each caption line's words into chunks whose joined text stays under
 * `maxChars` (spaces included). When `maxChars` is 0, each line renders as
 * a single chunk. Chunks are kept on screen until the next chunk takes
 * over so there are no visual gaps between them.
 *
 * Character-based chunking is used because word-count is a poor proxy for
 * visible line length — short words like "a it be" fit wildly differently
 * than long ones like "particularly", and different caption styles render
 * the same words at different widths.
 */
export function chunkLines(
  lines: CaptionLine[],
  maxChars: number
): CaptionChunk[] {
  if (!maxChars || maxChars <= 0) {
    return lines.map((line) => ({
      id: `${line.id}-0`,
      text: line.text,
      start: line.start,
      end: line.end,
      words: wordsForLineText(line),
      indexInLine: 0,
    }))
  }

  const out: CaptionChunk[] = []

  for (const line of lines) {
    const tokens = line.text.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue

    const timedWords = wordsForLineText(line)
    const slotStart = (i: number) => timedWords[i].start
    const slotEnd = (i: number) => timedWords[i].end

    // Greedy pack: take words while they still fit within maxChars
    // (including a space before each subsequent word). A single over-long
    // word still gets its own chunk so we never drop content.
    type Pending = { tokens: string[]; startIdx: number; endIdx: number }
    const packed: Pending[] = []
    let i = 0
    while (i < tokens.length) {
      const startIdx = i
      const group: string[] = []
      let chars = 0
      while (i < tokens.length) {
        const t = tokens[i]
        const add = t.length + (group.length > 0 ? 1 : 0)
        if (group.length > 0 && chars + add > maxChars) break
        group.push(t)
        chars += add
        i++
      }
      packed.push({ tokens: group, startIdx, endIdx: i })
    }

    for (let k = 0; k < packed.length; k++) {
      const p = packed[k]
      const start = slotStart(p.startIdx)
      const lastEnd = slotEnd(p.endIdx - 1)
      const nextStart =
        packed[k + 1] != null ? slotStart(packed[k + 1].startIdx) : line.end
      const end = Math.max(lastEnd, nextStart)
      const wordTimings: TranscribedWord[] = p.tokens.map((word, j) => ({
        word,
        start: slotStart(p.startIdx + j),
        end: slotEnd(p.startIdx + j),
      }))
      out.push({
        id: `${line.id}-${k}`,
        text: p.tokens.join(" "),
        start,
        end,
        words: wordTimings,
        indexInLine: k,
      })
    }
  }

  return out
}
