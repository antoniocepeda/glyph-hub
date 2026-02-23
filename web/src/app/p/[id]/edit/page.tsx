"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { PromptSchema, canonicalizePrompt, type PromptInput } from '@/lib/validators'
import { BODY_LIMIT } from '@/lib/constants'
import Link from 'next/link'

export default function EditPromptPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [form, setForm] = useState<PromptInput>({ title: '', body: '', tags: [], sourceUrl: null, visibility: 'public' })
  const [versionNote, setVersionNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [versionCount, setVersionCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const auth = getFirebaseAuth()
        const uid = auth?.currentUser?.uid
        if (!uid) {
          setUnauthorized(true)
          return
        }
        const db = getDb()
        if (!db) return
        const snap = await getDoc(doc(db, 'prompts', params.id))
        if (snap.exists()) {
          const d = snap.data() as { title?: string; body?: string; tags?: string[]; sourceUrl?: string | null; visibility?: PromptInput['visibility']; ownerId?: string }
          if (d.ownerId !== uid) {
            setUnauthorized(true)
            return
          }
          setForm({ title: d.title || '', body: d.body || '', tags: d.tags || [], sourceUrl: d.sourceUrl || null, visibility: d.visibility || 'public' })
        } else {
          setError('Prompt not found.')
        }

        try {
          const { getDocs: gd, query: q, collection: col } = await import('firebase/firestore')
          const vSnaps = await gd(q(col(db, 'prompts', params.id, 'versions')))
          setVersionCount(vSnaps.size)
        } catch {
          // version count is non-critical
        }
      } catch (e) {
        console.error('[edit] Failed to load prompt', e)
        setError('Failed to load prompt.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!user) throw new Error('Please sign in')
      const parsed = PromptSchema.parse(form)
      const canonical = canonicalizePrompt(parsed)
      const db = getDb()
      if (!db) throw new Error('No DB')

      const verRef = doc(collection(db, 'prompts', params.id, 'versions'))
      await setDoc(verRef, {
        ...canonical,
        authorId: user.uid,
        note: versionNote.trim() || undefined,
        createdAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'prompts', params.id), { ...canonical, updatedAt: serverTimestamp() }, { merge: true })
      router.push(`/p/${params.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const bodyLength = form.body.length
  const bodyRemaining = BODY_LIMIT - bodyLength

  if (loading) return <div className="mx-auto max-w-[900px] py-8">Loading…</div>
  if (unauthorized) return <div className="mx-auto max-w-[900px] py-8 text-sm text-red-400">You don&apos;t have permission to edit this prompt.</div>

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">Edit Prompt</h1>
        <Link
          href={`/p/${params.id}/versions`}
          className="text-sm text-[var(--gh-cyan)] hover:underline underline-offset-2"
        >
          View history{versionCount > 0 ? ` (${versionCount})` : ''}
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Body</label>
          <textarea
            className="w-full min-h-[200px] rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-[var(--gh-text-muted)]">
            <span>{bodyLength.toLocaleString()} / {BODY_LIMIT.toLocaleString()} characters</span>
            {bodyRemaining < 0 && (
              <span className="text-red-400">{Math.abs(bodyRemaining).toLocaleString()} over limit</span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Tags</label>
          <input className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm" value={form.tags.join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Source URL (optional)</label>
            <input
              className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={form.sourceUrl ?? ''}
              onChange={e => setForm({ ...form, sourceUrl: e.target.value || null })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select
              className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={form.visibility}
              onChange={e => setForm({ ...form, visibility: e.target.value as PromptInput['visibility'] })}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <div className="rounded-[12px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] p-4">
          <label className="block text-sm mb-1 text-[var(--gh-text-muted)]">Version note (optional)</label>
          <input
            className="w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            value={versionNote}
            onChange={e => setVersionNote(e.target.value)}
            placeholder="What changed? e.g., 'Improved formatting', 'Added examples'"
            maxLength={200}
          />
          <p className="text-xs text-[var(--gh-text-muted)] mt-1">
            Each save creates a new version. You can view and restore any past version from the history.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">{saving ? 'Saving…' : 'Save & Create Version'}</button>
          <Link href={`/p/${params.id}`} className="text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
