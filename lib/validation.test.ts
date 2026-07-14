import assert from "node:assert/strict"
import test from "node:test"

import { captionGroupBody } from "./validation.ts"

test("caption grouping accepts ordered positive word timestamps", () => {
  const parsed = captionGroupBody.safeParse({
    words: [
      { word: "one", start: 0, end: 0.2 },
      { word: "two", start: 0.18, end: 0.4 },
    ],
  })
  assert.equal(parsed.success, true)
})

test("caption grouping rejects zero-duration and reordered word timestamps", () => {
  const zeroDuration = captionGroupBody.safeParse({
    words: [{ word: "bad", start: 1, end: 1 }],
  })
  assert.equal(zeroDuration.success, false)

  const reordered = captionGroupBody.safeParse({
    words: [
      { word: "later", start: 2, end: 2.2 },
      { word: "earlier", start: 1, end: 1.2 },
    ],
  })
  assert.equal(reordered.success, false)
})
