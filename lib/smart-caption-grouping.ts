import { z } from "zod"
import { GoogleAuth } from "google-auth-library"

import type {
  CaptionLine,
  TranscribedWord,
} from "@/compositions/captions/types"

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1"
const MAX_GROUP_WORDS = 9
const MAX_GROUP_DURATION = 4.5
const MAX_BATCH_WORDS = 300
const MIN_BATCH_WORDS = 220
const BATCH_SEARCH_WINDOW = 80
const GEMINI_CONCURRENCY = 3

const returnedWordSchema = z
  .object({
    sourceIndex: z.number().int().nonnegative(),
    word: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((word) => !/\s/.test(word)),
    start: z.number().finite().nonnegative(),
    end: z.number().finite().nonnegative(),
  })
  .strict()

const responseSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            startIndex: z.number().int().nonnegative(),
            endIndex: z.number().int().nonnegative(),
            words: z.array(returnedWordSchema).min(1).max(MAX_GROUP_WORDS),
          })
          .strict()
      )
      .min(1)
      .max(10_000),
  })
  .strict()

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id?: string
}

type GeminiClient = {
  endpoint: string
  headers: Record<string, string>
}

export type SmartCaptionWord = TranscribedWord & {
  sourceIndex: number
}

export type SmartCaptionGroup = {
  startIndex: number
  endIndex: number
  words: SmartCaptionWord[]
}

export type TranscriptBatch = {
  startIndex: number
  words: TranscribedWord[]
}

function promptFor(
  words: TranscribedWord[],
  language: string | undefined,
  indexOffset: number
): string {
  const indexedWords = words.map((word, index) => ({
    sourceIndex: indexOffset + index,
    word: word.word.trim(),
    start: word.start,
    end: word.end,
  }))
  const firstIndex = indexOffset
  const lastIndex = indexOffset + words.length - 1

  return `You are a professional short-form video caption editor.

Turn the timestamped word transcript below into natural on-screen caption groups and quietly correct obvious speech-to-text errors.

Required output contract:
- Return groups containing startIndex, endIndex, and words.
- Each words item must contain sourceIndex, word, start, and end.
- Every input sourceIndex from ${firstIndex} through ${lastIndex} must appear exactly once, in order, inside one contiguous group.
- A group's words array must contain exactly one item for every sourceIndex from its startIndex through endIndex.
- Copy sourceIndex, start, and end EXACTLY from the corresponding input word. Only the word string may be corrected.
- Every returned word string must be one non-empty display token with no whitespace. Attach punctuation to a neighboring spoken word.
- Never split one input word into multiple words. Never merge words. Never add, remove, paraphrase, or reorder words.

Grouping rules:
- Prefer complete short sentences or meaningful sentence fragments that a viewer can read at a glance.
- Use 2-7 spoken words per group when natural; never exceed ${MAX_GROUP_WORDS} words.
- Never make a group span more than ${MAX_GROUP_DURATION} seconds.
- Break at sentence boundaries, strong clause boundaries, topic shifts, and pauses.
- Avoid orphaning articles, prepositions, conjunctions, or auxiliary verbs at the end of a group.
- Keep short phrases together (names, phrasal verbs, numbers, idioms, and fixed expressions).
- Fix punctuation, casing, names, and clear one-token transcription mistakes in word. Preserve spoken meaning.
${language ? `- Transcript language: ${language}.` : ""}

Timestamped transcript:
${JSON.stringify(indexedWords)}`
}

function textFrom(response: GeminiResponse): string | null {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) return part.text
    }
  }
  return null
}

/**
 * Split long transcripts near their strongest recent pause. Mirroring every
 * word and timestamp in Gemini's response is intentionally verbose, so bounded
 * requests avoid output truncation while retaining global source indexes.
 */
export function splitTranscriptForGemini(
  words: TranscribedWord[]
): TranscriptBatch[] {
  const batches: TranscriptBatch[] = []
  let startIndex = 0

  while (startIndex < words.length) {
    const remaining = words.length - startIndex
    if (remaining <= MAX_BATCH_WORDS) {
      batches.push({ startIndex, words: words.slice(startIndex) })
      break
    }

    const latestBoundary = startIndex + MAX_BATCH_WORDS
    const earliestBoundary = Math.max(
      startIndex + MIN_BATCH_WORDS,
      latestBoundary - BATCH_SEARCH_WINDOW
    )
    let bestBoundary = latestBoundary
    let bestScore = Number.NEGATIVE_INFINITY

    for (
      let boundary = earliestBoundary;
      boundary <= latestBoundary;
      boundary++
    ) {
      const previous = words[boundary - 1]
      const next = words[boundary]
      const pause = Math.max(0, next.start - previous.end)
      const punctuationBonus = /[.!?…]$/.test(previous.word.trim())
        ? 2
        : /[,;:]$/.test(previous.word.trim())
          ? 0.5
          : 0
      const score = pause + punctuationBonus
      if (score > bestScore) {
        bestScore = score
        bestBoundary = boundary
      }
    }

    batches.push({
      startIndex,
      words: words.slice(startIndex, bestBoundary),
    })
    startIndex = bestBoundary
  }

  return batches
}

export function geminiGroupingRequestBody(
  words: TranscribedWord[],
  language?: string,
  indexOffset = 0
) {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: promptFor(words, language, indexOffset) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          groups: {
            type: "array",
            minItems: 1,
            maxItems: words.length,
            items: {
              type: "object",
              properties: {
                startIndex: {
                  type: "integer",
                  description: "First inclusive global source index",
                },
                endIndex: {
                  type: "integer",
                  description: "Last inclusive global source index",
                },
                words: {
                  type: "array",
                  minItems: 1,
                  maxItems: MAX_GROUP_WORDS,
                  items: {
                    type: "object",
                    properties: {
                      sourceIndex: { type: "integer" },
                      word: {
                        type: "string",
                        description:
                          "One corrected display token with no whitespace",
                      },
                      start: {
                        type: "number",
                        description: "Exact start copied from the source word",
                      },
                      end: {
                        type: "number",
                        description: "Exact end copied from the source word",
                      },
                    },
                    required: ["sourceIndex", "word", "start", "end"],
                  },
                },
              },
              required: ["startIndex", "endIndex", "words"],
            },
          },
        },
        required: ["groups"],
      },
    },
  }
}

async function createGeminiClient(
  apiKey: string | undefined,
  rawCredentials: string | undefined
): Promise<GeminiClient> {
  let endpoint: string
  let headers: Record<string, string> = { "Content-Type": "application/json" }

  if (rawCredentials) {
    const credentials = JSON.parse(rawCredentials) as ServiceAccount
    const project = process.env.GOOGLE_CLOUD_PROJECT || credentials.project_id
    if (!project) throw new Error("Vertex AI project is not configured")

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    })
    const client = await auth.getClient()
    const { token } = await client.getAccessToken()
    if (!token) throw new Error("Could not authenticate with Vertex AI")

    endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(VERTEX_LOCATION)}/publishers/google/models/${encodeURIComponent(MODEL)}:generateContent`
    headers = { ...headers, Authorization: `Bearer ${token}` }
  } else {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`
    headers["x-goog-api-key"] = apiKey!
  }

  return { endpoint, headers }
}

async function requestSmartCaptionGroups(
  client: GeminiClient,
  batch: TranscriptBatch,
  language?: string
): Promise<SmartCaptionGroup[]> {
  const response = await fetch(client.endpoint, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(
      geminiGroupingRequestBody(batch.words, language, batch.startIndex)
    ),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Gemini grouping failed (${response.status})`)
  }

  const json = (await response.json()) as GeminiResponse
  const text = textFrom(json)
  if (!text) throw new Error("Gemini returned no caption groups")

  const raw = JSON.parse(text) as unknown
  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success) throw new Error("Gemini returned invalid caption groups")
  return parsed.data.groups
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  fn: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0
  const workerCount = Math.min(concurrency, values.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = cursor++
        if (index >= values.length) return
        results[index] = await fn(values[index])
      }
    })
  )

  return results
}

export function buildSmartCaptionLines(
  words: TranscribedWord[],
  groups: SmartCaptionGroup[]
): CaptionLine[] | null {
  if (words.length === 0 || groups.length === 0) return null

  const lines: CaptionLine[] = []
  let expectedIndex = 0

  for (const group of groups) {
    if (
      group.startIndex !== expectedIndex ||
      group.endIndex < group.startIndex ||
      group.endIndex >= words.length ||
      !Array.isArray(group.words)
    ) {
      return null
    }

    const source = words.slice(group.startIndex, group.endIndex + 1)
    const sourceStart = source[0].start
    const sourceEnd = source[source.length - 1].end
    const duration = sourceEnd - sourceStart
    if (
      source.length > MAX_GROUP_WORDS ||
      group.words.length !== source.length ||
      !Number.isFinite(sourceStart) ||
      !Number.isFinite(sourceEnd) ||
      sourceEnd <= sourceStart ||
      duration > MAX_GROUP_DURATION
    ) {
      return null
    }

    const timedWords: TranscribedWord[] = []
    for (let offset = 0; offset < group.words.length; offset++) {
      const returned = group.words[offset]
      const original = source[offset]
      const sourceIndex = group.startIndex + offset
      const word = returned.word.trim()

      if (
        returned.sourceIndex !== sourceIndex ||
        !word ||
        /\s/.test(word) ||
        !Number.isFinite(original.start) ||
        !Number.isFinite(original.end) ||
        original.end <= original.start ||
        !Number.isFinite(returned.start) ||
        !Number.isFinite(returned.end) ||
        returned.start !== original.start ||
        returned.end !== original.end ||
        returned.end <= returned.start ||
        (offset > 0 && returned.start < group.words[offset - 1].start)
      ) {
        return null
      }

      timedWords.push({
        word,
        start: returned.start,
        end: returned.end,
      })
    }

    const text = timedWords.map((word) => word.word).join(" ")
    lines.push({
      id: `line-${lines.length}-${timedWords[0].start.toFixed(3)}`,
      text,
      start: timedWords[0].start,
      end: timedWords[timedWords.length - 1].end,
      words: timedWords,
    })
    expectedIndex = group.endIndex + 1
  }

  return expectedIndex === words.length ? lines : null
}

export async function generateSmartCaptionLines(
  words: TranscribedWord[],
  language?: string
): Promise<CaptionLine[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!apiKey && !rawCredentials) return null
  if (words.length === 0) return null

  const client = await createGeminiClient(apiKey, rawCredentials)
  const batches = splitTranscriptForGemini(words)
  const groupedBatches = await mapWithConcurrency(
    batches,
    GEMINI_CONCURRENCY,
    (batch) => requestSmartCaptionGroups(client, batch, language)
  )

  return buildSmartCaptionLines(words, groupedBatches.flat())
}
