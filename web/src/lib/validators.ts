import { z } from 'zod'

export const PromptSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().url().nullable().optional().default(null),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
})

export type PromptInput = z.infer<typeof PromptSchema>

export function canonicalizePrompt(input: PromptInput): PromptInput {
  const title = input.title.trim()
  const body = input.body.replace(/\r\n/g, '\n').trim()
  const tags = Array.from(new Set((input.tags || []).map(t => t.trim().toLowerCase()))).sort()
  const sourceUrl = input.sourceUrl || null
  const visibility = input.visibility || 'public'
  return { title, body, tags, sourceUrl, visibility }
}


// Collections
export const CollectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  visibility: z.enum(['public', 'private']).default('private'),
})

export type CollectionInput = z.infer<typeof CollectionSchema>

export function canonicalizeCollection(input: CollectionInput): CollectionInput {
  return {
    title: input.title.trim(),
    visibility: input.visibility || 'private',
  }
}


