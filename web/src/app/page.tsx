"use client"
import { useEffect, useMemo, useState } from 'react'
import { collection, doc as fsDoc, getDoc as fsGetDoc, getDocs, query, where } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
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

export default function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      try {
        const col = collection(db, 'prompts')
        const qy = query(col, where('visibility', '==', 'public'))
        const snaps = await getDocs(qy)
        const list = snaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; body: string; tags: string[]; visibility: 'public' | 'unlisted' | 'private'; stats?: Prompt['stats'] }) })) as Prompt[]
        setPrompts(list)
        // Prefetch prompt detail pages for snappy navigation
        list.slice(0, 6).forEach(p => router.prefetch(`/p/${p.id}`))
      } catch (e) {
        console.error('Failed to load prompts', e)
        setError('Unable to load prompts yet. Try creating one.')
      }
    }
    load()
  }, [])

  const topThree = useMemo(() => {
    return prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 3)
  }, [prompts])

  return (
    <div>
      <section className="mt-8 mb-8">
        <QuickPaste />
      </section>
      {topThree.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl mb-3 text-[var(--gh-text-dim)]">Trending</h2>
          <div className="mb-3 text-sm">
            <Link href="/public" className="text-[var(--gh-cyan)] hover:underline underline-offset-2">Browse all public prompts</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topThree.map(p => (
              <Link key={p.id} href={`/p/${p.id}`} className="group rounded-[16px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4 shadow-[var(--gh-shadow-1)] hover:shadow-[var(--gh-shadow-2)] transition">
                <h3 className="font-display text-lg mb-2">{p.title}</h3>
                <p className="text-[var(--gh-text-dim)] text-sm line-clamp-3">{p.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(p.tags || []).map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]">#{t}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

const BODY_LIMIT = 7331

function QuickPaste() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [tagsValue, setTagsValue] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [preferredModel, setPreferredModel] = useState('')
  const [description, setDescription] = useState('')
  const [howToUse, setHowToUse] = useState('')
  const [botField, setBotField] = useState('')

  const canPrivate = !!getFirebaseAuth()?.currentUser
  useEffect(() => {
    if (!canPrivate && visibility === 'private') {
      setVisibility('public')
    }
  }, [canPrivate, visibility])

  // Load default visibility from user preferences
  useEffect(() => {
    async function loadPref() {
      const uid = getFirebaseAuth()?.currentUser?.uid
      if (!uid) return
      const db = getDb()
      if (!db) return
      try {
        const userSnap = await fsGetDoc(fsDoc(db, 'users', uid))
        if (userSnap.exists()) {
          const data = userSnap.data() as { preferences?: { defaultVisibility?: 'public'|'unlisted'|'private' } }
          const pref = data.preferences
          if (pref?.defaultVisibility && ['public','unlisted','private'].includes(pref.defaultVisibility)) {
            setVisibility(pref.defaultVisibility)
          }
        }
      } catch {}
    }
    loadPref()
  }, [])

  const bodyLength = body.length
  const bodyRemaining = BODY_LIMIT - bodyLength

  return (
    <div className="rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display">New Prompt</div>
        <button type="button" onClick={() => setAdvanced(v => !v)} className="text-xs text-[var(--gh-cyan)]">
          {advanced ? 'Basic' : 'Advanced'}
        </button>
      </div>
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm mb-2"
      />
      <textarea
        placeholder="Paste your prompt..."
        value={body}
        onChange={e => setBody(e.target.value)}
        className="w-full min-h-[100px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
        style={{ resize: 'none' }}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--gh-text-muted)]">
        <span>Character count: {bodyLength.toLocaleString()} / {BODY_LIMIT.toLocaleString()}</span>
        {bodyRemaining < 0 && (
          <span className="text-red-400">{Math.abs(bodyRemaining).toLocaleString()} over limit</span>
        )}
      </div>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', top: 'auto', opacity: 0 }}
      >
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
      {advanced && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Tags (comma separated)</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={tagsValue}
              onChange={e => setTagsValue(e.target.value)}
              placeholder="writing, brainstorming"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Source URL (optional)</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Preferred Model</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={preferredModel}
              onChange={e => setPreferredModel(e.target.value)}
              placeholder="e.g., gpt-5, claude-4-sonnet, flux.1-dev"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Description</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">How To Use</label>
            <textarea
              className="w-full min-h-[120px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={howToUse}
              onChange={e => setHowToUse(e.target.value)}
              placeholder="Step-by-step guidance"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Visibility</label>
            <div role="radiogroup" aria-label="Visibility" className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="qp_visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                />
                Public
              </label>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="qp_visibility"
                  value="unlisted"
                  checked={visibility === 'unlisted'}
                  onChange={() => setVisibility('unlisted')}
                />
                Unlisted
              </label>
              <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${!canPrivate ? 'opacity-50' : ''}`}> 
                <input
                  type="radio"
                  name="qp_visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => canPrivate && setVisibility('private')}
                  disabled={!canPrivate}
                />
                Private
                {!canPrivate && (
                  <Link href="/login" className="ml-2 text-xs text-[var(--gh-text-muted)] hover:underline underline-offset-2">Sign in</Link>
                )}
              </label>
            </div>
          </div>
        </div>
      )}
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      <div className="mt-2">
        <button
          disabled={saving || !body.trim()}
          className="rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black"
          onClick={async () => {
            setSaving(true)
            setErr(null)
            try {
              const vis = advanced ? visibility : 'public'
              const trimmedBody = body.trim()
              if (!trimmedBody) {
                setErr('Prompt body cannot be empty.')
                return
              }

              const tags = advanced ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) : []
              const src = advanced && sourceUrl.trim() ? sourceUrl.trim() : null
              const extras: Record<string, unknown> = {}
              if (advanced) {
                if (preferredModel.trim()) extras.preferredModel = preferredModel.trim()
                if (description.trim()) extras.description = description.trim()
                if (howToUse.trim()) extras.howToUse = howToUse.trim()
              }

              const user = getFirebaseAuth()?.currentUser
              const token = user ? await user.getIdToken() : null

              const payload = {
                title: title.trim() ? title : undefined,
                body: trimmedBody,
                tags,
                sourceUrl: src ?? undefined,
                visibility: vis,
                ...extras,
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
                } else if (msg === 'visibility_not_allowed') {
                  setErr('Sign in to save private prompts.')
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
          }}
        >
          {saving ? 'Saving…' : 'Save' }
        </button>
      </div>
    </div>
  )
}

 
