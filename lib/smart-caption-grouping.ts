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

const responseSchema = z.object({
  groups: z.array(
    z.object({
      startIndex: z.number().int().nonnegative(),
      endIndex: z.number().int().nonnegative(),
      text: z.string().min(1).max(500),
    })
  ),
})

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

export type SmartCaptionGroup = {
  startIndex: number
  endIndex: number
  text: string
}

function promptFor(words: TranscribedWord[], language?: string): string {
  const indexedWords = words.map((word, index) => ({
    index,
    word: word.word.trim(),
    start: Number(word.start.toFixed(3)),
    end: Number(word.end.toFixed(3)),
  }))

  return `You are a professional short-form video caption editor.

Turn the timestamped word transcript below into natural on-screen caption groups and quietly correct obvious speech-to-text errors.

Rules:
- Every input index must appear exactly once, in order, using contiguous inclusive startIndex/endIndex ranges.
- Prefer complete short sentences or meaningful sentence fragments that a viewer can read at a glance.
- Use 2-7 spoken words per group when natural; never exceed ${MAX_GROUP_WORDS} input words.
- Never make a group span more than ${MAX_GROUP_DURATION} seconds.
- Break at sentence boundaries, strong clause boundaries, topic shifts, and pauses.
- Avoid orphaning articles, prepositions, conjunctions, or auxiliary verbs at the end of a group.
- Keep short phrases together (names, phrasal verbs, numbers, idioms, and fixed expressions).
- The text field is the polished display text for that range. Fix punctuation, casing, names, and only clear transcription mistakes. Do not paraphrase, summarize, add facts, or remove spoken meaning.
- Do not include timestamps or index labels in text.
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

export function timedWordsForText(
  source: TranscribedWord[],
  polishedText: string
): TranscribedWord[] {
  const tokens = polishedText.split(/\s+/).filter(Boolean)
  if (tokens.length === source.length) {
    return tokens.map((word, index) => ({
      word,
      start: source[index].start,
      end: source[index].end,
    }))
  }

  const start = source[0].start
  const end = source[source.length - 1].end
  const duration = Math.max(0.01, end - start)
  return tokens.map((word, index) => ({
    word,
    start: start + (duration * index) / tokens.length,
    end: start + (duration * (index + 1)) / tokens.length,
  }))
}

export function buildSmartCaptionLines(
  words: TranscribedWord[],
  groups: SmartCaptionGroup[]
): CaptionLine[] | null {
  if (groups.length === 0) return null

  const lines: CaptionLine[] = []
  let expectedIndex = 0

  for (const group of groups) {
    if (
      group.startIndex !== expectedIndex ||
      group.endIndex < group.startIndex ||
      group.endIndex >= words.length
    ) {
      return null
    }

    const source = words.slice(group.startIndex, group.endIndex + 1)
    const duration = source[source.length - 1].end - source[0].start
    if (
      source.length > MAX_GROUP_WORDS ||
      duration > MAX_GROUP_DURATION ||
      !group.text.trim()
    ) {
      return null
    }

    const text = group.text.replace(/\s+/g, " ").trim()
    const timedWords = timedWordsForText(source, text)
    const displayTokens = text.split(/\s+/).filter(Boolean)
    if (
      timedWords.length !== displayTokens.length ||
      timedWords.some(
        (word, index) =>
          word.word !== displayTokens[index] ||
          !Number.isFinite(word.start) ||
          !Number.isFinite(word.end) ||
          word.end <= word.start ||
          (index > 0 && word.start < timedWords[index - 1].start)
      )
    ) {
      return null
    }

    lines.push({
      id: `line-${lines.length}-${source[0].start.toFixed(3)}`,
      text,
      start: source[0].start,
      end: source[source.length - 1].end,
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

  const requestBody = JSON.stringify({
    contents: [
      { role: "user", parts: [{ text: promptFor(words, language) }] },
    ],
    generationConfig: {
      temperature: 0.15,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                startIndex: { type: "integer" },
                endIndex: { type: "integer" },
                text: { type: "string" },
              },
              required: ["startIndex", "endIndex", "text"],
            },
          },
        },
        required: ["groups"],
      },
    },
  })

  let endpoint: string
  let headers: Record<string, string> = { "Content-Type": "application/json" }

  if (rawCredentials) {
    const credentials = JSON.parse(rawCredentials!) as ServiceAccount
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: requestBody,
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Gemini grouping failed (${response.status})`)
  }

  const json = (await response.json()) as GeminiResponse
  const text = textFrom(json)
  if (!text) throw new Error("Gemini returned no caption groups")

  const parsed = responseSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error("Gemini returned invalid caption groups")

  return buildSmartCaptionLines(words, parsed.data.groups)
}
