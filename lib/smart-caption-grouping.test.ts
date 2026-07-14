import assert from "node:assert/strict"
import test from "node:test"

import { chunkLines } from "../compositions/captions/chunk.ts"
import type { TranscribedWord } from "../compositions/captions/types.ts"
import {
  buildSmartCaptionLines,
  timedWordsForText,
} from "./smart-caption-grouping.ts"

test("Gemini corrections preserve Whisper timestamps word by word", () => {
  const whisperWords: TranscribedWord[] = [
    { word: "san", start: 1, end: 1.2 },
    { word: "fransisco", start: 1.21, end: 1.6 },
  ]

  const lines = buildSmartCaptionLines(whisperWords, [
    { startIndex: 0, endIndex: 1, text: "San Francisco" },
  ])
  assert.ok(lines)
  assert.deepEqual(lines[0].words, [
    { word: "San", start: 1, end: 1.2 },
    { word: "Francisco", start: 1.21, end: 1.6 },
  ])

  // Pop and Karaoke consume chunk.words, so this is the exact data those
  // styles use to decide which word should be highlighted at each frame.
  const [previewChunk] = chunkLines(lines, 0)
  assert.deepEqual(previewChunk.words, lines[0].words)
})

test("token-count corrections still produce a timestamp for every word", () => {
  const timed = timedWordsForText(
    [{ word: "gonna", start: 2, end: 2.6 }],
    "going to"
  )

  assert.deepEqual(timed, [
    { word: "going", start: 2, end: 2.3 },
    { word: "to", start: 2.3, end: 2.6 },
  ])
})

test("smart groups reject gaps that could lose timed words", () => {
  const whisperWords: TranscribedWord[] = [
    { word: "one", start: 0, end: 0.2 },
    { word: "two", start: 0.21, end: 0.4 },
    { word: "three", start: 0.41, end: 0.7 },
  ]

  const lines = buildSmartCaptionLines(whisperWords, [
    { startIndex: 0, endIndex: 0, text: "One" },
    { startIndex: 2, endIndex: 2, text: "Three" },
  ])
  assert.equal(lines, null)
})
