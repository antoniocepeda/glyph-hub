"use client"
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import {
  collection, getDocs, query, where, orderBy, limit,
  startAfter, type QueryDocumentSnapshot, type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { engagementScore } from '@/lib/constants'
import type { Visibility, PromptStats } from '@/lib/types'
import { PromptCard, PromptCardSkeleton, PromptCardListItem } from '@/components/PromptCard'

type PromptItem = {
  id: string
  title: string
  body: string
  tags: string[]
  visibility: Visibility
  stats?: PromptStats
  createdAt?: Date
  updatedAt?: Date
  forkOf?: string
}

type SortMode = 'newest' | 'oldest' | 'popular' | 'title'
type FilterVisibility = 'all' | Visibility
type ViewMode = 'grid' | 'list'

const PAGE_SIZE = 24

export default function MyPromptsPage() {
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortMode>('newest')
  const [filterVis, setFilterVis] = useState<FilterVisibility>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setAuthReady(true)
      return
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null)
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  const loadPrompts = useCallback(async (reset = false) => {
    if (!uid) return
    setLoading(true)
    setError(null)
    try {
      const db = getDb()
      if (!db) return
      const constraints = [
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      ]
      const baseQuery = query(collection(db, 'prompts'), ...constraints)
      const finalQuery = !reset && cursor ? query(baseQuery, startAfter(cursor)) : baseQuery
      const snaps = await getDocs(finalQuery)
      const list: PromptItem[] = snaps.docs.map(d => {
        const data = d.data() as {
          title?: string; body?: string; tags?: string[]
          visibility?: Visibility; stats?: PromptStats
          createdAt?: Timestamp; updatedAt?: Timestamp
          forkOf?: string
        }
        return {
          id: d.id,
          title: data.title || 'Untitled',
          body: data.body || '',
          tags: data.tags || [],
          visibility: data.visibility || 'public',
          stats: data.stats,
          createdAt: data.createdAt?.toDate?.() ?? undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? undefined,
          forkOf: data.forkOf,
        }
      })
      setPrompts(prev => reset ? list : [...prev, ...list])
      const last = snaps.docs[snaps.docs.length - 1] ?? null
      setCursor(last)
      setHasMore(snaps.docs.length === PAGE_SIZE)
    } catch (e) {
      console.error('[my-prompts] Failed to load', e)
      setError(e instanceof Error ? e.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }, [uid, cursor])

  useEffect(() => {
    if (authReady && uid) loadPrompts(true)
  }, [authReady, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = prompts
    if (filterVis !== 'all') {
      list = list.filter(p => p.visibility === filterVis)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [prompts, filterVis, search])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    switch (sortBy) {
      case 'newest':
        return copy.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      case 'oldest':
        return copy.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
      case 'popular':
        return copy.sort((a, b) => engagementScore(b) - engagementScore(a))
      case 'title':
        return copy.sort((a, b) => a.title.localeCompare(b.title))
      default:
        return copy
    }
  }, [filtered, sortBy])

  const counts = useMemo(() => {
    const c = { all: prompts.length, public: 0, unlisted: 0, private: 0 }
    for (const p of prompts) {
      if (p.visibility === 'public') c.public++
      else if (p.visibility === 'unlisted') c.unlisted++
      else c.private++
    }
    return c
  }, [prompts])

  if (authReady && !uid) {
    return (
      <div className="mx-auto max-w-[900px] py-12 text-center">
        <h1 className="font-display text-2xl mb-4">My Prompts</h1>
        <p className="text-[var(--gh-text-muted)] mb-4">Sign in to see your prompts.</p>
        <Link href="/login" className="rounded-[10px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">Sign In</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1000px] py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl">My Prompts</h1>
          <p className="text-sm text-[var(--gh-text-muted)] mt-1">
            {counts.all} total &mdash; {counts.public} public, {counts.unlisted} unlisted, {counts.private} private
          </p>
        </div>
        <Link href="/new" className="rounded-[10px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black self-start">
          New Prompt
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search your prompts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={filterVis}
            onChange={e => setFilterVis(e.target.value as FilterVisibility)}
            className="rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            aria-label="Filter by visibility"
          >
            <option value="all">All ({counts.all})</option>
            <option value="public">Public ({counts.public})</option>
            <option value="unlisted">Unlisted ({counts.unlisted})</option>
            <option value="private">Private ({counts.private})</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortMode)}
            className="rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            aria-label="Sort by"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="popular">Most popular</option>
            <option value="title">Alphabetical</option>
          </select>
          {/* View toggle */}
          <div className="flex rounded-[10px] border border-[var(--gh-border)] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--gh-surface)] text-[var(--gh-cyan)]'
                  : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
              }`}
              aria-label="Grid view"
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
                <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
                <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
                <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--gh-surface)] text-[var(--gh-cyan)]'
                  : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
              }`}
              aria-label="List view"
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="1" y1="3" x2="15" y2="3" />
                <line x1="1" y1="8" x2="15" y2="8" />
                <line x1="1" y1="13" x2="15" y2="13" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {/* Skeleton loading */}
      {loading && prompts.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PromptCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(p => (
            <PromptCard
              key={p.id}
              id={p.id}
              title={p.title}
              body={p.body}
              tags={p.tags}
              visibility={p.visibility}
              stats={p.stats}
              updatedAt={p.updatedAt}
              forkOf={p.forkOf}
              showVisibilityBadge
              showStats
              showActions
              variant="full"
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {sorted.map(p => (
            <PromptCardListItem
              key={p.id}
              id={p.id}
              title={p.title}
              visibility={p.visibility}
              stats={p.stats}
              updatedAt={p.updatedAt}
              showVisibilityBadge
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && !loading && (
        <div className="text-center py-12">
          {search || filterVis !== 'all' ? (
            <p className="text-[var(--gh-text-muted)]">No prompts match your filters.</p>
          ) : (
            <>
              <p className="text-[var(--gh-text-muted)] mb-2">You haven&apos;t created any prompts yet.</p>
              <p className="text-xs text-[var(--gh-text-muted)] mb-6 max-w-sm mx-auto">
                Create your first prompt to start building your library. Public prompts are visible to everyone, unlisted prompts are accessible via link, and private prompts are just for you.
              </p>
              <Link href="/new" className="rounded-[10px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">
                Create your first prompt
              </Link>
            </>
          )}
        </div>
      )}

      {/* Load more */}
      {hasMore && prompts.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            className="rounded-[12px] px-4 py-2 text-sm border border-[var(--gh-border)] disabled:opacity-50"
            onClick={() => loadPrompts(false)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
