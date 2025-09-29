import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { canonicalizePrompt, PromptSchema } from '@/lib/validators'
import { computeChecksum } from '@/lib/checksum'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { createHash } from 'node:crypto'
import { getAuth } from 'firebase-admin/auth'
import { containsBannedWords } from '@/lib/utils'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

const QuickPasteSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  sourceUrl: z.string().url().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  preferredModel: z.string().optional(),
  description: z.string().optional(),
  howToUse: z.string().optional(),
  honeypot: z.string().optional(),
})

const MAX_PER_MINUTE = 3
const MAX_PER_DAY = 25
const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

class RateLimitError extends Error {
  constructor(public readonly retryAt: number) {
    super('rate_limited')
  }
}

function getClientFingerprint(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean)
  const ip = parts[0] || req.ip || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  return createHash('sha256').update(ip).update('|').update(ua).digest('hex')
}

async function enforceRateLimit(db: Firestore, key: string): Promise<void> {
  const now = Date.now()
  const minuteWindow = Math.floor(now / MINUTE_MS)
  const dayWindow = Math.floor(now / DAY_MS)
  const ref = db.collection('rate_limits').doc(`quick:${key}`)

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    let minuteCount = 0
    let dayCount = 0
    let storedMinuteWindow = minuteWindow
    let storedDayWindow = dayWindow

    if (snap.exists) {
      const data = snap.data() as {
        minuteWindow?: number
        minuteCount?: number
        dayWindow?: number
        dayCount?: number
      }
      storedMinuteWindow = data.minuteWindow ?? minuteWindow
      storedDayWindow = data.dayWindow ?? dayWindow
      minuteCount = storedMinuteWindow === minuteWindow ? (data.minuteCount ?? 0) : 0
      dayCount = storedDayWindow === dayWindow ? (data.dayCount ?? 0) : 0
    }

    if (minuteCount >= MAX_PER_MINUTE) {
      throw new RateLimitError((storedMinuteWindow + 1) * MINUTE_MS)
    }
    if (dayCount >= MAX_PER_DAY) {
      throw new RateLimitError((storedDayWindow + 1) * DAY_MS)
    }

    tx.set(ref, {
      minuteWindow,
      minuteCount: minuteCount + 1,
      dayWindow,
      dayCount: dayCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
}

export async function POST(req: NextRequest) {
  const db = getAdminDb()
  if (!db) {
    return NextResponse.json({ error: 'server_unconfigured' }, { status: 500 })
  }

  const authUid = await resolveAuthenticatedUid(req)

  let payload: z.infer<typeof QuickPasteSchema>
  try {
    payload = QuickPasteSchema.parse(await req.json())
  } catch (error) {
    const msg = error instanceof z.ZodError ? error.issues[0]?.message || 'invalid_payload' : 'invalid_payload'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const fingerprint = getClientFingerprint(req)
  try {
    await enforceRateLimit(db, fingerprint)
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'rate_limited', retryAt: error.retryAt }, { status: 429 })
    }
    console.error('[quick-paste] rate limit failed', error)
    return NextResponse.json({ error: 'rate_limit_failed' }, { status: 500 })
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : typeof payload.tags === 'string' && payload.tags
      ? payload.tags.split(',')
      : []

  const requestedVisibility = payload.visibility ?? 'public'
  if (!authUid && requestedVisibility === 'private') {
    return NextResponse.json({ error: 'visibility_not_allowed' }, { status: 403 })
  }
  const finalVisibility = requestedVisibility

  const canonicalInput = {
    title: payload.title && payload.title.trim() ? payload.title : 'Untitled',
    body: payload.body,
    tags: tags.map(t => t.trim()).filter(Boolean),
    sourceUrl: payload.sourceUrl ?? null,
    visibility: finalVisibility,
  }

  let canonical
  try {
    canonical = canonicalizePrompt(PromptSchema.parse(canonicalInput))
  } catch (error) {
    const msg = error instanceof z.ZodError ? error.issues[0]?.message || 'invalid_prompt' : 'invalid_prompt'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (payload.honeypot && payload.honeypot.trim()) {
    console.warn('[quick-paste] Honeypot field flagged request')
    return NextResponse.json({ error: 'bot_detected' }, { status: 400 })
  }

  const bannedWord = containsBannedWords(`${canonical.title}\n${canonical.body}`)
  if (bannedWord) {
    console.warn('[quick-paste] Blocked banned term submission')
    return NextResponse.json({ error: 'content_not_allowed' }, { status: 400 })
  }

  const checksum = computeChecksum(canonical.body)

  try {
    const dup = await db.collection('prompts').where('checksum', '==', checksum).limit(1).get()
    if (!dup.empty) {
      return NextResponse.json({ error: 'duplicate_prompt' }, { status: 409 })
    }
  } catch (error) {
    console.error('[quick-paste] duplicate check failed', error)
    return NextResponse.json({ error: 'duplicate_check_failed' }, { status: 500 })
  }

  const extras: Record<string, unknown> = {}
  if (payload.preferredModel?.trim()) extras.preferredModel = payload.preferredModel.trim()
  if (payload.description?.trim()) extras.description = payload.description.trim()
  if (payload.howToUse?.trim()) extras.howToUse = payload.howToUse.trim()

  const id = nanoid()
  try {
    await db.collection('prompts').doc(id).set({
      ...canonical,
      ownerId: authUid ?? null,
      createdByType: authUid ? 'user' : 'anonymous',
      checksum,
      stats: { views: 0, copies: 0, likes: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...extras,
    })
  } catch (error) {
    console.error('[quick-paste] failed to save prompt', error)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ id })
}

async function resolveAuthenticatedUid(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  const token = match[1]
  try {
    const auth = getAuth()
    const decoded = await auth.verifyIdToken(token)
    return decoded.uid
  } catch (error) {
    console.warn('[quick-paste] Ignoring invalid ID token', error)
    return null
  }
}
