"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getDb } from '@/lib/firebase'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

const PAGE_SIZE = 20

type Prompt = {
  id: string
  title: string
  body: string
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  stats?: { views?: number; copies?: number; likes?: number }
}

function engagementScore(p: Prompt): number {
  const s = p.stats || {}
  return (s.likes || 0) * 3 + (s.copies || 0) * 2 + (s.views || 0)
}

export default function PublicPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(reset = false) {
    setLoading(true)
    setError(null)
    try {
      const db = getDb()
      if (!db) return
      const base = query(
        collection(db, 'prompts'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      )
      const qy = !reset && cursor ? query(base, startAfter(cursor)) : base
      const snaps = await getDocs(qy)
      const list = snaps.docs.map(d => ({
        id: d.id,
        ...(d.data() as { title: string; body: string; tags: string[]; visibility: 'public' | 'unlisted' | 'private'; stats?: Prompt['stats'] }),
      })) as Prompt[]
      setPrompts(prev => (reset ? list : prev.concat(list)))
      const last = snaps.docs[snaps.docs.length - 1] || null
      setCursor(last)
      setHasMore(snaps.docs.length === PAGE_SIZE)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load public prompts'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const ranked = useMemo(() => prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)), [prompts])

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">Public Prompts</h1>
      </div>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="group rounded-[16px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{p.title}</h3>
            </div>
            <p className="text-[var(--gh-text-dim)] text-sm line-clamp-3 mt-2">{p.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.tags || []).map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]">#{t}</span>
              ))}
            </div>
            <div className="mt-3 text-xs text-[var(--gh-text-muted)]">
              {p.stats?.likes || 0} likes · {p.stats?.copies || 0} copies · {p.stats?.views || 0} views
            </div>
          </Link>
        ))}
        {ranked.length === 0 && !loading && <div className="text-sm text-[var(--gh-text-muted)]">No public prompts yet.</div>}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          className="rounded-[12px] px-4 py-2 text-sm border border-[var(--gh-border)] disabled:opacity-50"
          onClick={() => load(false)}
          disabled={loading || !hasMore}
        >
          {loading ? 'Loading…' : hasMore ? 'Load more' : 'No more'}
        </button>
      </div>
    </div>
  )
}
