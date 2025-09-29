"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { PromptSchema, type PromptInput, canonicalizePrompt } from '@/lib/validators'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { encodeShareCode } from '@/lib/share-code'
// Anonymous submissions flow through the Quick Paste API

const BODY_LIMIT = 7331

export default function NewPromptPage() {
  const router = useRouter()
  const [form, setForm] = useState<PromptInput>({ title: '', body: '', tags: [], sourceUrl: null, visibility: 'public' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [botField, setBotField] = useState('')

  // Load default visibility from user preferences
  useEffect(() => {
    async function loadPref() {
      const auth = getFirebaseAuth()
      const uid = auth?.currentUser?.uid
      if (!uid) return
      const db = getDb()
      if (!db) return
      try {
        const docSnap = await getDoc(doc(db, 'users', uid))
        if (docSnap.exists()) {
          const data = docSnap.data() as { preferences?: { defaultVisibility?: 'public' | 'unlisted' | 'private' } }
          const pref = data.preferences
          const nextVis = pref?.defaultVisibility
          if (nextVis && (['public','unlisted','private'] as const).includes(nextVis)) {
            setForm(f => ({ ...f, visibility: nextVis }))
          }
        }
      } catch {}
    }
    loadPref()
  }, [])

  // One-time draft hydration from sessionStorage (moved out of render)
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('gh_new_prompt_draft') : null
      if (!raw) return
      const draft = JSON.parse(raw)
      sessionStorage.removeItem('gh_new_prompt_draft')
      setForm(f => {
        if (f.title || f.body) return f
        return {
          title: draft.title || '',
          body: draft.body || '',
          tags: Array.isArray(draft.tags) ? draft.tags : [],
          sourceUrl: draft.sourceUrl || null,
          visibility: draft.visibility || 'public',
        }
      })
    } catch {}
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser ?? null
      if (!user && form.visibility === 'private') {
        setError('Sign in to save private prompts.')
        setSaving(false)
        return
      }

      const parsed = PromptSchema.parse(form)
      const canonical = canonicalizePrompt(parsed)

      const token = user ? await user.getIdToken() : null
      const payload = {
        title: canonical.title,
        body: canonical.body,
        tags: canonical.tags,
        sourceUrl: canonical.sourceUrl ?? undefined,
        visibility: canonical.visibility,
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
          throw new Error(`Rate limited. Try again at ${retry.toLocaleTimeString()}.`)
        }
        if (msg === 'invalid_payload' || msg === 'invalid_prompt') throw new Error('Check your prompt fields and try again.')
        if (msg === 'rate_limited') throw new Error('Too many submissions. Please slow down.')
        if (msg === 'duplicate_prompt') throw new Error('A similar prompt already exists. Consider forking it.')
        if (msg === 'duplicate_check_failed') throw new Error('Unable to verify duplicates right now. Please try again later.')
        if (msg === 'visibility_not_allowed') throw new Error('Sign in to save private prompts.')
        if (msg === 'content_not_allowed') throw new Error('Content not allowed. Adjust your prompt and try again.')
        if (msg === 'bot_detected') throw new Error('Submission flagged as automated. Refresh and try again.')
        throw new Error(msg === 'server_unconfigured' ? 'Server is not ready for prompt creation yet.' : 'Failed to save prompt.')
      }
      const json = await res.json()
      if (!json?.id) throw new Error('Unexpected server response.')
      setShareCode(encodeShareCode(canonical))
      router.push(`/p/${json.id}`)
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Validation error')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error')
      }
    } finally {
      setSaving(false)
    }
  }

  const bodyLength = form.body.length
  const bodyRemaining = BODY_LIMIT - bodyLength

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">New Prompt</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-10000px', top: 'auto', opacity: 0 }}
        >
          <label htmlFor="gh-note-field" className="text-xs">Leave this field empty</label>
          <input
            id="gh-note-field"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={botField}
            onChange={e => setBotField(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm placeholder:text-[var(--gh-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Short title"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Body</label>
          <textarea
            className="w-full min-h-[200px] rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm placeholder:text-[var(--gh-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
            placeholder="Paste the prompt..."
            style={{ resize: 'none' }}
          />
          <div className="mt-2 flex items-center justify-between text-sm text-[var(--gh-text-muted)]">
            <span>Character count: {bodyLength.toLocaleString()} / {BODY_LIMIT.toLocaleString()}</span>
            {bodyRemaining < 0 && (
              <span className="text-red-400">
                {Math.abs(bodyRemaining).toLocaleString()} over limit
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Tags (comma separated)</label>
          <input
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm placeholder:text-[var(--gh-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
            value={form.tags.join(', ')}
            onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            placeholder="writing, brainstorming"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Source URL (optional)</label>
            <input
              className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm placeholder:text-[var(--gh-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
              value={form.sourceUrl ?? ''}
              onChange={e => setForm({ ...form, sourceUrl: e.target.value || null })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select
              className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
              value={form.visibility}
              onChange={e => setForm({ ...form, visibility: e.target.value as PromptInput['visibility'] })}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-sm font-medium transition bg-[var(--gh-cyan)] text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/60"
        >
          {saving ? 'Saving…' : 'Save Prompt'}
        </button>
      </form>

      {shareCode && (
        <div className="mt-6 p-4 rounded-[12px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-[var(--gh-text-dim)]">Share Code</h2>
            <button
              onClick={() => navigator.clipboard.writeText(shareCode)}
              className="text-sm text-[var(--gh-cyan)]"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto text-sm">{shareCode}</pre>
        </div>
      )}
    </div>
  )
}
