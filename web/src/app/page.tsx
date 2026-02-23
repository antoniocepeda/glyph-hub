"use client"
import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BODY_LIMIT, engagementScore } from '@/lib/constants'
import type { PromptDoc } from '@/lib/types'
import { PromptCard, PromptCardSkeleton } from '@/components/PromptCard'

type Prompt = Pick<PromptDoc, 'id' | 'title' | 'body' | 'tags' | 'visibility' | 'stats'>

export default function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const prefetch = useCallback((id: string) => router.prefetch(`/p/${id}`), [router])

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) { setLoading(false); return }
      try {
        const col = collection(db, 'prompts')
        const qy = query(col, where('visibility', '==', 'public'))
        const snaps = await getDocs(qy)
        const list = snaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; body: string; tags: string[]; visibility: 'public' | 'unlisted' | 'private'; stats?: Prompt['stats'] }) })) as Prompt[]
        setPrompts(list)
        list.slice(0, 6).forEach(p => prefetch(p.id))
      } catch (e) {
        console.error('Failed to load prompts', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [prefetch])

  const topSix = useMemo(() => {
    return prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 6)
  }, [prompts])

  const totalStats = useMemo(() => {
    let views = 0, likes = 0, copies = 0
    for (const p of prompts) {
      views += p.stats?.views ?? 0
      likes += p.stats?.likes ?? 0
      copies += p.stats?.copies ?? 0
    }
    return { count: prompts.length, views, likes, copies }
  }, [prompts])

  return (
    <div className="-mt-6">
      {/* ── Hero ── */}
      <section className="pt-16 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-4">
          <span className="gh-gradient-text">Save, share, and remix</span>
          <br />
          <span className="text-[var(--gh-text)]">AI prompts</span>
        </h1>
        <p className="text-[var(--gh-text-muted)] text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
          The open prompt library. Create once, use everywhere, fork anything.
        </p>
        <div className="flex items-center justify-center gap-3 text-sm mb-12">
          <Link
            href="/public"
            className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 bg-[var(--gh-cyan)] text-black font-medium hover:brightness-110 transition"
          >
            Browse prompts
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <a
            href="#create"
            className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 border border-[var(--gh-border)] text-[var(--gh-text-muted)] hover:text-[var(--gh-text)] hover:border-[var(--gh-border)]/80 transition-colors"
          >
            Create a prompt
          </a>
        </div>

        {/* Stats strip */}
        {totalStats.count > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 text-sm">
            <div className="text-center">
              <div className="font-display text-xl sm:text-2xl text-[var(--gh-text)]">{totalStats.count}</div>
              <div className="text-[var(--gh-text-muted)] text-xs mt-0.5">Prompts</div>
            </div>
            <div className="w-px h-8 bg-[var(--gh-border)]" />
            <div className="text-center">
              <div className="font-display text-xl sm:text-2xl text-[var(--gh-text)]">{totalStats.likes}</div>
              <div className="text-[var(--gh-text-muted)] text-xs mt-0.5">Likes</div>
            </div>
            <div className="w-px h-8 bg-[var(--gh-border)]" />
            <div className="text-center">
              <div className="font-display text-xl sm:text-2xl text-[var(--gh-text)]">{totalStats.copies}</div>
              <div className="text-[var(--gh-text-muted)] text-xs mt-0.5">Copies</div>
            </div>
          </div>
        )}
      </section>

      {/* ── Features ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
        {[
          {
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gh-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
            title: 'Create & version',
            desc: 'Save prompts with full version history. Edit, iterate, and restore any past version.',
          },
          {
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gh-violet)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>,
            title: 'Fork & remix',
            desc: 'Fork any public prompt to build on others\u2019 work. Use variables for reusable templates.',
          },
          {
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gh-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
            title: 'Share anywhere',
            desc: 'Short URLs, share codes, embeds, and JSON export. Get your prompts where they need to go.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-[14px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-5 transition-colors hover:border-[var(--gh-border)]/80"
          >
            <div className="mb-3">{f.icon}</div>
            <h3 className="font-display text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-[var(--gh-text-muted)] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Quick Paste ── */}
      <section id="create" className="mb-16 scroll-mt-20">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-[var(--gh-border)]" />
          <h2 className="font-display text-lg text-[var(--gh-text-dim)] px-3">Create a prompt</h2>
          <div className="h-px flex-1 bg-[var(--gh-border)]" />
        </div>
        <QuickPaste />
      </section>

      {/* ── Trending ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gh-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Trending prompts
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/trending"
              className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] transition-colors"
            >
              View all
            </Link>
            <Link
              href="/public"
              className="inline-flex items-center gap-1 text-[var(--gh-cyan)] hover:underline underline-offset-2"
            >
              Browse public
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && topSix.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topSix.map((p, i) => (
              <PromptCard
                key={p.id}
                id={p.id}
                title={p.title}
                body={p.body}
                tags={p.tags}
                stats={p.stats}
                showStats
                variant="compact"
                rank={i + 1}
              />
            ))}
          </div>
        )}

        {!loading && topSix.length === 0 && (
          <div className="text-center py-12 text-sm text-[var(--gh-text-muted)]">
            No public prompts yet. Be the first to create one.
          </div>
        )}
      </section>
    </div>
  )
}

function QuickPaste() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [botField, setBotField] = useState('')
  const [focused, setFocused] = useState(false)

  const bodyLength = body.length
  const bodyRemaining = BODY_LIMIT - bodyLength

  async function handleSave() {
    setSaving(true)
    setErr(null)
    try {
      const trimmedBody = body.trim()
      if (!trimmedBody) {
        setErr('Prompt body cannot be empty.')
        return
      }

      const user = getFirebaseAuth()?.currentUser
      const token = user ? await user.getIdToken() : null

      const payload = {
        title: title.trim() ? title : undefined,
        body: trimmedBody,
        tags: [],
        visibility: 'public',
        honeypot: botField,
      }

      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (token) headers.authorization = `Bearer ${token}`

      const res = await fetch('/api/quick-paste', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Failed' }))
        const msg = typeof errJson.error === 'string' ? errJson.error : 'Failed'
        if (res.status === 429 && typeof errJson.retryAt === 'number') {
          const retry = new Date(errJson.retryAt)
          setErr(`Rate limited. Try again at ${retry.toLocaleTimeString()}.`)
        } else if (msg === 'invalid_payload' || msg === 'invalid_prompt') {
          setErr('Check your prompt fields and try again.')
        } else if (msg === 'rate_limited') {
          setErr('Too many submissions. Please slow down.')
        } else if (msg === 'duplicate_prompt') {
          setErr('A similar prompt already exists. Consider forking it.')
        } else if (msg === 'duplicate_check_failed') {
          setErr('Unable to verify duplicates right now. Please try again in a bit.')
        } else if (msg === 'content_not_allowed') {
          setErr('Content not allowed. Adjust your prompt and try again.')
        } else if (msg === 'bot_detected') {
          setErr('Submission flagged as automated. Refresh and try again.')
        } else {
          setErr(msg === 'server_unconfigured' ? 'Server is not ready for quick paste yet.' : 'Failed to save prompt.')
        }
        return
      }
      const json = await res.json()
      if (!json?.id) {
        setErr('Unexpected server response.')
        return
      }
      router.push(`/p/${json.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setErr(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`rounded-[16px] bg-[var(--gh-surface)] border p-5 transition-all duration-200 ${
        focused
          ? 'border-[var(--gh-cyan)]/20 shadow-[0_0_0_1px_rgba(0,240,255,0.08),0_8px_32px_rgba(0,0,0,0.3)]'
          : 'border-[var(--gh-border)] shadow-[var(--gh-shadow-1)]'
      }`}
    >
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent border-0 px-0 py-1 text-sm text-[var(--gh-text)] placeholder:text-[var(--gh-text-muted)]/60 focus:outline-none mb-1"
      />
      <div className="h-px bg-[var(--gh-border)]/50 mb-2" />
      <textarea
        placeholder="Paste your prompt here..."
        value={body}
        onChange={e => setBody(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full min-h-[120px] bg-transparent border-0 px-0 py-1 text-sm text-[var(--gh-text)] placeholder:text-[var(--gh-text-muted)]/60 focus:outline-none leading-relaxed"
        style={{ resize: 'none' }}
      />

      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', opacity: 0 }}>
        <label htmlFor="gh-home-bot" className="text-xs">Leave this field empty</label>
        <input
          id="gh-home-bot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={botField}
          onChange={e => setBotField(e.target.value)}
        />
      </div>

      {err && <div className="text-xs text-red-400 mt-3">{err}</div>}

      {/* Footer bar */}
      <div className="mt-3 pt-3 border-t border-[var(--gh-border)]/50 flex items-center justify-between">
        <button
          disabled={saving || !body.trim()}
          className="rounded-[10px] px-4 py-2 text-sm font-medium bg-[var(--gh-cyan)] text-black disabled:opacity-40 hover:brightness-110 transition"
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save prompt'}
        </button>
        <div className="text-[11px] text-[var(--gh-text-muted)]">
          {bodyLength > 0 && (
            <span className={bodyRemaining < 0 ? 'text-red-400' : ''}>
              {bodyLength.toLocaleString()} / {BODY_LIMIT.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
