"use client"
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { engagementScore } from '@/lib/constants'
import type { PromptDoc } from '@/lib/types'
import { PromptCard, PromptCardSkeleton } from '@/components/PromptCard'

type Prompt = Pick<PromptDoc, 'id' | 'title' | 'body' | 'tags' | 'visibility' | 'stats'>

export default function TrendingPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const ranked = useMemo(
    () => prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)),
    [prompts]
  )

  const top = ranked[0]
  const runners = ranked.slice(1, 3)
  const rest = ranked.slice(3)

  return (
    <div className="mx-auto max-w-[1000px] py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gh-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Trending
          </h1>
          <p className="text-sm text-[var(--gh-text-muted)] mt-1">
            Top prompts ranked by likes, copies, and views
          </p>
        </div>
        <Link
          href="/public"
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] hover:border-[var(--gh-cyan)]/50 transition-colors self-start"
        >
          Browse all
        </Link>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-[16px] p-6 bg-[var(--gh-surface)] border border-[var(--gh-border)] animate-pulse">
            <div className="h-6 w-2/3 rounded bg-[var(--gh-bg-soft)] mb-3" />
            <div className="h-4 w-full rounded bg-[var(--gh-bg-soft)] mb-2" />
            <div className="h-4 w-4/5 rounded bg-[var(--gh-bg-soft)] mb-2" />
            <div className="h-4 w-1/2 rounded bg-[var(--gh-bg-soft)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PromptCardSkeleton />
            <PromptCardSkeleton />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {!loading && ranked.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[var(--gh-text-muted)] mb-2">No public prompts yet.</p>
          <Link href="/new" className="text-sm text-[var(--gh-cyan)] hover:underline underline-offset-2">
            Create the first one
          </Link>
        </div>
      )}

      {!loading && ranked.length > 0 && (
        <div className="space-y-6">
          {/* #1 Featured */}
          {top && (
            <PromptCard
              id={top.id}
              title={top.title}
              body={top.body}
              tags={top.tags}
              stats={top.stats}
              variant="featured"
              rank={1}
            />
          )}

          {/* #2 and #3 */}
          {runners.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {runners.map((p, i) => (
                <PromptCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  body={p.body}
                  tags={p.tags}
                  stats={p.stats}
                  showStats
                  variant="compact"
                  rank={i + 2}
                />
              ))}
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <>
              <div className="border-t border-[var(--gh-border)] pt-6">
                <h2 className="font-display text-lg text-[var(--gh-text-dim)] mb-4">More trending prompts</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p, i) => (
                  <PromptCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    body={p.body}
                    tags={p.tags}
                    stats={p.stats}
                    showStats
                    variant="compact"
                    rank={i + 4}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
