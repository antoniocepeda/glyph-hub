"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { PAGE_SIZE, engagementScore } from '@/lib/constants'
import type { PromptDoc } from '@/lib/types'
import { PromptCard, PromptCardSkeleton } from '@/components/PromptCard'

type Prompt = Pick<PromptDoc, 'id' | 'title' | 'body' | 'tags' | 'visibility' | 'stats'>
type SortMode = 'trending' | 'newest' | 'most-liked' | 'most-copied'

export default function PublicPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('trending')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const load = useCallback(async (reset = false) => {
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
      const qy = !reset && cursorRef.current ? query(base, startAfter(cursorRef.current)) : base
      const snaps = await getDocs(qy)
      const list = snaps.docs.map(d => ({
        id: d.id,
        ...(d.data() as { title: string; body: string; tags: string[]; visibility: 'public' | 'unlisted' | 'private'; stats?: Prompt['stats'] }),
      })) as Prompt[]
      setPrompts(prev => (reset ? list : prev.concat(list)))
      cursorRef.current = snaps.docs[snaps.docs.length - 1] || null
      setHasMore(snaps.docs.length === PAGE_SIZE)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load public prompts'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(true)
  }, [load])

  const allTags = useMemo(() => {
    const tagCount: Record<string, number> = {}
    for (const p of prompts) {
      for (const t of p.tags || []) {
        tagCount[t] = (tagCount[t] || 0) + 1
      }
    }
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag)
  }, [prompts])

  const filtered = useMemo(() => {
    let list = prompts
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    if (selectedTag) {
      list = list.filter(p => (p.tags || []).includes(selectedTag))
    }
    return list
  }, [prompts, search, selectedTag])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    switch (sortBy) {
      case 'trending':
        return copy.sort((a, b) => engagementScore(b) - engagementScore(a))
      case 'newest':
        return copy
      case 'most-liked':
        return copy.sort((a, b) => (b.stats?.likes ?? 0) - (a.stats?.likes ?? 0))
      case 'most-copied':
        return copy.sort((a, b) => (b.stats?.copies ?? 0) - (a.stats?.copies ?? 0))
      default:
        return copy
    }
  }, [filtered, sortBy])

  return (
    <div className="mx-auto max-w-[1000px] py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Public Prompts</h1>
            <p className="text-sm text-[var(--gh-text-muted)] mt-1">
              Discover and explore {prompts.length > 0 ? `${prompts.length}+` : ''} community-shared prompts
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black font-medium hover:brightness-110 transition"
          >
            New Prompt
          </Link>
          <Link
            href="/trending"
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] hover:border-[var(--gh-cyan)]/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Trending
          </Link>
          </div>
        </div>
      </div>

      {/* Search + Sort toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gh-text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] pl-9 pr-3 py-2 text-sm focus:border-[var(--gh-cyan)]/50 focus:outline-none transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortMode)}
          className="rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          aria-label="Sort by"
        >
          <option value="trending">Trending</option>
          <option value="newest">Newest</option>
          <option value="most-liked">Most Liked</option>
          <option value="most-copied">Most Copied</option>
        </select>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !selectedTag
                ? 'border-[var(--gh-cyan)]/40 bg-[var(--gh-cyan)]/5 text-[var(--gh-cyan)]'
                : 'border-[var(--gh-border)] text-[var(--gh-text-muted)] hover:text-[var(--gh-text)] hover:border-[var(--gh-border)]/80'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedTag === tag
                  ? 'border-[var(--gh-cyan)]/40 bg-[var(--gh-cyan)]/5 text-[var(--gh-cyan)]'
                  : 'border-[var(--gh-border)] text-[var(--gh-text-muted)] hover:text-[var(--gh-text)] hover:border-[var(--gh-border)]/80'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {/* Skeleton loading */}
      {loading && prompts.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <PromptCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && sorted.length > 0 && (search || selectedTag) && (
        <p className="text-xs text-[var(--gh-text-muted)] mb-3">
          {sorted.length} prompt{sorted.length !== 1 ? 's' : ''} found
          {selectedTag && <> tagged <span className="text-[var(--gh-cyan)]">#{selectedTag}</span></>}
          {search && <> matching &ldquo;{search}&rdquo;</>}
        </p>
      )}

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p, i) => (
          <PromptCard
            key={p.id}
            id={p.id}
            title={p.title}
            body={p.body}
            tags={p.tags}
            stats={p.stats}
            showStats
            variant="compact"
            rank={sortBy === 'trending' && !search && !selectedTag ? i + 1 : undefined}
          />
        ))}
      </div>

      {/* Empty state */}
      {sorted.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-[var(--gh-text-muted)] mb-2">
            {search || selectedTag ? 'No prompts match your filters.' : 'No public prompts yet.'}
          </p>
          {(search || selectedTag) && (
            <button
              onClick={() => { setSearch(''); setSelectedTag(null) }}
              className="text-sm text-[var(--gh-cyan)] hover:underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Load more */}
      {hasMore && prompts.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            className="rounded-[12px] px-5 py-2.5 text-sm border border-[var(--gh-border)] hover:border-[var(--gh-cyan)]/50 disabled:opacity-50 transition-colors"
            onClick={() => load(false)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
