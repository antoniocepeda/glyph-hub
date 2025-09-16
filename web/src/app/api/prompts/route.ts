import { NextResponse } from 'next/server'
import { canonicalizePrompt, PromptSchema } from '@/lib/validators'
import { computeChecksum } from '@/lib/checksum'
import { customAlphabet } from 'nanoid'
import { getApps, initializeApp, type AppOptions } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export const runtime = 'nodejs'

function getAdminDb() {
  try {
    if (!getApps().length) {
      let projectId: string | undefined = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT
      if (!projectId && process.env.FIREBASE_CONFIG) {
        try { projectId = JSON.parse(process.env.FIREBASE_CONFIG as string).projectId } catch {}
      }
      const options: AppOptions | undefined = projectId ? { projectId } : undefined
      initializeApp(options)
    }
  } catch {
    // Ignore duplicate-app or any benign init errors
  }
  return getFirestore()
}

export async function POST(req: Request) {
  try {
    const db = getAdminDb()

    const raw = await req.json().catch(() => ({}))
    const parsed = PromptSchema.parse({
      title: raw.title ?? '',
      body: raw.body ?? '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      sourceUrl: raw.sourceUrl ?? null,
      visibility: raw.visibility ?? 'public',
    })
    const canonical = canonicalizePrompt(parsed)

    if (canonical.visibility === 'private') {
      return NextResponse.json({ error: 'Sign in required for private prompts' }, { status: 400 })
    }

    const checksum = computeChecksum(canonical.body)
    // Skip duplicate read to avoid index/rules issues for anonymous users

    const id = nanoid()
    const ref = db.collection('prompts').doc(id)

    const extras: Record<string, unknown> = {}
    if (typeof raw.preferredModel === 'string' && raw.preferredModel.trim()) extras.preferredModel = raw.preferredModel.trim()
    if (typeof raw.description === 'string' && raw.description.trim()) extras.description = raw.description.trim()
    if (typeof raw.howToUse === 'string' && raw.howToUse.trim()) extras.howToUse = raw.howToUse.trim()

    await ref.set({
      ...canonical,
      ownerId: 'anon',
      checksum,
      stats: { views: 0, copies: 0, likes: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...extras,
    })

    return NextResponse.json({ id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}


