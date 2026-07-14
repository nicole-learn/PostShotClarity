import { z } from "zod"

// Allow-lists for what users can upload. Anything else is rejected at the
// upload-url step so misnamed / misleading files never get a presigned URL.
export const VIDEO_EXTS = ["mp4", "mov", "webm", "m4v", "mkv"] as const
export const AUDIO_EXTS = ["m4a", "wav", "mp3", "aac", "ogg", "webm"] as const

export const VIDEO_CONTENT_TYPE: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
}

export const AUDIO_CONTENT_TYPE: Record<string, string> = {
  m4a: "audio/mp4",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
}

export function extOf(fileName: string): string {
  const parts = fileName.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

// S3 keys we issue all follow `<prefix>/<uuid>.<ext>`. Refusing anything else
// means the progress/transcribe/render endpoints can't be tricked into
// touching arbitrary objects in the bucket.
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

export const inputVideoKey = z
  .string()
  .regex(new RegExp(`^inputs/${UUID_RE}\\.[a-z0-9]{1,8}$`))

export const inputAudioKey = z
  .string()
  .regex(new RegExp(`^captions-audio/${UUID_RE}\\.[a-z0-9]{1,8}$`))

export const anyInputKey = z
  .string()
  .regex(new RegExp(`^(inputs|captions-audio)/${UUID_RE}\\.[a-z0-9]{1,8}$`))

// Remotion renderIds are short random strings. Keep the character class
// permissive (alnum + dash/underscore) but cap the length.
export const renderId = z.string().regex(/^[A-Za-z0-9_-]{4,64}$/)

export const uploadUrlBody = z.object({
  fileName: z.string().min(1).max(255),
  prefix: z.enum(["audio", "video"]).optional(),
})

export const renderBody = z.object({
  key: anyInputKey,
  // Render props are a structured object consumed server-side by the Remotion
  // composition; we don't enumerate every field here, but we cap the JSON
  // size in the route handler to stop callers from shipping megabyte payloads.
  props: z.record(z.string(), z.unknown()),
})

export const transcribeBody = z.object({
  key: inputAudioKey,
})

const transcribedWord = z.object({
  word: z.string().min(1).max(100),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
})

export const captionGroupBody = z
  .object({
    words: z.array(transcribedWord).min(1).max(10_000),
    language: z.string().max(50).optional(),
  })
  .superRefine(({ words }, ctx) => {
    for (let index = 0; index < words.length; index++) {
      const word = words[index]
      if (word.end <= word.start) {
        ctx.addIssue({
          code: "custom",
          path: ["words", index, "end"],
          message: "Word end must be after its start",
        })
      }
      if (index > 0 && word.start < words[index - 1].start) {
        ctx.addIssue({
          code: "custom",
          path: ["words", index, "start"],
          message: "Word timestamps must be in source order",
        })
      }
    }
  })
