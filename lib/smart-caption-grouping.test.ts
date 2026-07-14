import assert from "node:assert/strict"
import test from "node:test"

import { chunkLines } from "../compositions/captions/chunk.ts"
import type { TranscribedWord } from "../compositions/captions/types.ts"
import {
  buildSmartCaptionLines,
  geminiGroupingRequestBody,
  splitTranscriptForGemini,
  type SmartCaptionGroup,
} from "./smart-caption-grouping.ts"

test("Gemini returns every corrected word with its exact Whisper timestamp", () => {
  const whisperWords: TranscribedWord[] = [
    { word: "i", start: 0.03, end: 0.17 },
    { word: "visited", start: 0.19, end: 0.58 },
    { word: "san", start: 0.63, end: 0.81 },
    { word: "fransisco", start: 0.86, end: 1.41 },
  ]
  const geminiWords = [
    { sourceIndex: 0, word: "I", start: 0.03, end: 0.17 },
    { sourceIndex: 1, word: "visited", start: 0.19, end: 0.58 },
    { sourceIndex: 2, word: "San", start: 0.63, end: 0.81 },
    { sourceIndex: 3, word: "Francisco.", start: 0.86, end: 1.41 },
  ]

  const lines = buildSmartCaptionLines(whisperWords, [
    { startIndex: 0, endIndex: 3, words: geminiWords },
  ])
  assert.ok(lines)
  assert.equal(lines[0].text, "I visited San Francisco.")
  assert.equal(lines[0].start, geminiWords[0].start)
  assert.equal(lines[0].end, geminiWords[3].end)
  assert.deepEqual(
    lines[0].words,
    geminiWords.map(({ word, start, end }) => ({ word, start, end }))
  )

  // Pop and Karaoke consume chunk.words, so this is also the exact highlight
  // timeline used by both the Player preview and final Remotion render.
  const [chunk] = chunkLines(lines, 0)
  assert.deepEqual(chunk.words, lines[0].words)
})

test("Gemini cannot silently retime a word", () => {
  const source: TranscribedWord[] = [
    { word: "exact", start: 1.111, end: 1.444 },
    { word: "timing", start: 1.5, end: 1.987 },
  ]

  const lines = buildSmartCaptionLines(source, [
    {
      startIndex: 0,
      endIndex: 1,
      words: [
        { sourceIndex: 0, word: "Exact", start: 1.111, end: 1.444 },
        // A response that is merely close is still rejected.
        { sourceIndex: 1, word: "timing.", start: 1.501, end: 1.987 },
      ],
    },
  ])
  assert.equal(lines, null)
})

test("Gemini cannot omit, duplicate, reorder, split, or merge source words", () => {
  const source: TranscribedWord[] = [
    { word: "one", start: 0, end: 0.2 },
    { word: "two", start: 0.21, end: 0.4 },
    { word: "three", start: 0.41, end: 0.7 },
  ]
  const valid = [
    { sourceIndex: 0, word: "One", start: 0, end: 0.2 },
    { sourceIndex: 1, word: "two", start: 0.21, end: 0.4 },
    { sourceIndex: 2, word: "three.", start: 0.41, end: 0.7 },
  ]

  const invalidGroups: SmartCaptionGroup[][] = [
    [{ startIndex: 0, endIndex: 2, words: valid.slice(0, 2) }],
    [
      {
        startIndex: 0,
        endIndex: 2,
        words: [valid[0], { ...valid[1], sourceIndex: 0 }, valid[2]],
      },
    ],
    [
      {
        startIndex: 0,
        endIndex: 2,
        words: [valid[1], valid[0], valid[2]],
      },
    ],
    [
      {
        startIndex: 0,
        endIndex: 2,
        words: [valid[0], { ...valid[1], word: "two words" }, valid[2]],
      },
    ],
    [
      {
        startIndex: 0,
        endIndex: 2,
        words: [...valid, { ...valid[2], word: "extra" }],
      },
    ],
  ]

  for (const groups of invalidGroups) {
    assert.equal(buildSmartCaptionLines(source, groups), null)
  }
})

test("smart groups reject source-index gaps between groups", () => {
  const source: TranscribedWord[] = [
    { word: "one", start: 0, end: 0.2 },
    { word: "two", start: 0.21, end: 0.4 },
    { word: "three", start: 0.41, end: 0.7 },
  ]

  const lines = buildSmartCaptionLines(source, [
    {
      startIndex: 0,
      endIndex: 0,
      words: [{ sourceIndex: 0, word: "One", start: 0, end: 0.2 }],
    },
    {
      startIndex: 2,
      endIndex: 2,
      words: [{ sourceIndex: 2, word: "three.", start: 0.41, end: 0.7 }],
    },
  ])
  assert.equal(lines, null)
})

test("the Gemini structured-output schema requires words and timestamps", () => {
  const request = geminiGroupingRequestBody([
    { word: "hello", start: 2.12345, end: 2.67891 },
  ])
  const groupSchema =
    request.generationConfig.responseSchema.properties.groups.items
  const groupsSchema = request.generationConfig.responseSchema.properties.groups
  const wordSchema = groupSchema.properties.words.items

  // A group-array maxItems makes Vertex multiply the nested word schema by
  // that number and reject longer transcripts as too complex.
  assert.equal("maxItems" in groupsSchema, false)
  assert.deepEqual(groupSchema.required, ["startIndex", "endIndex", "words"])
  assert.deepEqual(wordSchema.required, ["sourceIndex", "word", "start", "end"])
  assert.match(request.contents[0].parts[0].text, /2\.12345/)

  // The legacy text-only response is never accepted or locally repaired.
  const legacy = [
    { startIndex: 0, endIndex: 0, text: "Hello" },
  ] as unknown as SmartCaptionGroup[]
  assert.equal(
    buildSmartCaptionLines(
      [{ word: "hello", start: 2.12345, end: 2.67891 }],
      legacy
    ),
    null
  )
})

test("long transcripts are batched without losing global word indexes", () => {
  const words = Array.from({ length: 650 }, (_, index) => ({
    word: index === 250 || index === 500 ? `word${index}.` : `word${index}`,
    start: index * 0.1,
    end: index * 0.1 + 0.08,
  }))
  const batches = splitTranscriptForGemini(words)

  assert.deepEqual(
    batches.map((batch) => batch.startIndex),
    [0, 251, 501]
  )
  assert.ok(batches.every((batch) => batch.words.length <= 300))
  assert.deepEqual(
    batches.flatMap((batch) => batch.words),
    words
  )
})
