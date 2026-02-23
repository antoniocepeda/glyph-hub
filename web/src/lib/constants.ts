import type { PromptDoc } from './types'

// Max characters allowed in a prompt body. Matches Firestore rules limit.
export const BODY_LIMIT = 7331

export const PAGE_SIZE = 20

export const RATE_LIMIT = {
  CHAT_PER_MINUTE: 10,
  CHAT_PER_DAY: 100,
  QUICK_PASTE_PER_MINUTE: 3,
  QUICK_PASTE_PER_DAY: 25,
} as const

export function engagementScore(p: Pick<PromptDoc, 'stats'>): number {
  const s = p.stats || { views: 0, copies: 0, likes: 0 }
  return (s.likes || 0) * 3 + (s.copies || 0) * 2 + (s.views || 0)
}
