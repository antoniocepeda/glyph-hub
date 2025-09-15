"use client"
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function TrendingPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const snaps = await getDocs(query(collection(db, 'prompts'), where('visibility', '==', 'public')))
        const list = snaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; body: string; tags: string[]; stats?: Prompt['stats'] }) })) as Prompt[]
        setPrompts(list)
        list.slice(0, 9).forEach(p => router.prefetch(`/p/${p.id}`))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load trending'
        setError(msg)
      }
    }
    load()
  }, [router])

  const ranked = useMemo(() => prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)), [prompts])

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">Trending</h1>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="group rounded-[16px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{p.title}</h3>
              <span className="text-xs text-[var(--gh-text-muted)]">{engagementScore(p)}</span>
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
        {ranked.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No public prompts yet.</div>}
      </div>
    </div>
  )
}


