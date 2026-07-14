import assert from "node:assert/strict"
import test from "node:test"

import { chunkLines } from "./chunk.ts"
import type { CaptionLine } from "./types.ts"

const original: CaptionLine = {
  id: "line-1",
  text: "Old caption here",
  start: 1,
  end: 4,
  words: [
    { word: "Old", start: 1, end: 1.5 },
    { word: "caption", start: 1.6, end: 2.5 },
    { word: "here", start: 2.6, end: 4 },
  ],
}

test("edited text replaces timed words in whole-line captions", () => {
  const [chunk] = chunkLines([{ ...original, text: "Edited words now" }], 0)

  assert.equal(chunk.text, "Edited words now")
  assert.equal(
    chunk.words.map(({ word }) => word).join(" "),
    "Edited words now"
  )
  assert.deepEqual(
    chunk.words.map(({ start, end }) => [start, end]),
    original.words.map(({ start, end }) => [start, end])
  )
})

test("word-count edits receive timings across the existing line span", () => {
  const text = "A completely different edited caption"
  const [chunk] = chunkLines([{ ...original, text }], 0)

  assert.equal(chunk.words.map(({ word }) => word).join(" "), text)
  assert.equal(chunk.words[0].start, original.start)
  assert.equal(chunk.words.at(-1)?.end, original.end)
})

test("manual character chunks use edited words", () => {
  const chunks = chunkLines(
    [{ ...original, text: "A completely different edited caption" }],
    12
  )

  assert.deepEqual(
    chunks.map(({ text }) => text),
    ["A completely", "different", "edited", "caption"]
  )
})
