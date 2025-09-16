"use client"
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { PromptSchema, type PromptInput, canonicalizePrompt } from '@/lib/validators'
import { computeChecksum } from '@/lib/checksum'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import { encodeShareCode } from '@/lib/share-code'
import { containsBannedWords } from '@/lib/utils'
// Anonymous auth disabled in production; require sign-in

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export default function NewPromptPage() {
  const [form, setForm] = useState<PromptInput>({ title: '', body: '', tags: [], sourceUrl: null, visibility: 'public' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [shareCode, setShareCode] = useState<string | null>(null)

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      const parsed = PromptSchema.parse(form)
      const canonical = canonicalizePrompt(parsed)
      const checksum = computeChecksum(canonical.body)
      const banned = containsBannedWords(canonical.body)
      if (banned) throw new Error(`Content not allowed: ${banned}`)
      const id = nanoid()
      const db = getDb()
      if (!db) throw new Error('Firebase is not configured. Add .env.local')
      // Deduplication: only check client-side if signed-in (rules allow owner read)
      if (user) {
        const dup = await getDocs(query(collection(db, 'prompts'), where('checksum', '==', checksum)))
        if (!dup.empty) throw new Error('A similar prompt already exists. Consider forking it.')
      }
      if (!user) {
        const ref = doc(collection(db, 'prompts'), id)
        await setDoc(ref, {
          ...canonical,
          ownerId: 'anon',
          checksum,
          stats: { views: 0, copies: 0, likes: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else {
        const ref = doc(collection(db, 'prompts'), id)
        await setDoc(ref, {
          ...canonical,
          ownerId: user.uid,
          checksum,
          stats: { views: 0, copies: 0, likes: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      // Update user's lastCreateAt for simple per-user rate limiting in rules (only if signed-in)
      if (user) await setDoc(doc(db, 'users', user.uid), { lastCreateAt: serverTimestamp() }, { merge: true })
      const code = encodeShareCode(canonical)
      setShareCode(code)
      // TODO: route to /p/[id] after we scaffold it
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

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">New Prompt</h1>
      {/* Prefill from session storage once */}
      {(() => {
        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem('gh_new_prompt_draft')
          if (raw) {
            try {
              const draft = JSON.parse(raw)
              sessionStorage.removeItem('gh_new_prompt_draft')
              if (!form.title && !form.body) {
                setForm({
                  title: draft.title || '',
                  body: draft.body || '',
                  tags: Array.isArray(draft.tags) ? draft.tags : [],
                  sourceUrl: draft.sourceUrl || null,
                  visibility: draft.visibility || 'public',
                })
              }
            } catch {}
          }
        }
        return null
      })()}
      <form onSubmit={onSubmit} className="space-y-4">
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
          />
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


