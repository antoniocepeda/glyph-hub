"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { PromptSchema, canonicalizePrompt, type PromptInput } from '@/lib/validators'

export default function EditPromptPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [form, setForm] = useState<PromptInput>({ title: '', body: '', tags: [], sourceUrl: null, visibility: 'public' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const snap = await getDoc(doc(db, 'prompts', params.id))
        if (snap.exists()) {
          const d = snap.data() as { title?: string; body?: string; tags?: string[]; sourceUrl?: string | null; visibility?: PromptInput['visibility'] }
          setForm({ title: d.title || '', body: d.body || '', tags: d.tags || [], sourceUrl: d.sourceUrl || null, visibility: d.visibility || 'public' })
        }
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
      // Save version
      const verRef = doc(collection(db, 'prompts', params.id, 'versions'))
      await setDoc(verRef, { ...canonical, authorId: user.uid, createdAt: serverTimestamp() })
      // Overwrite latest fields
      await setDoc(doc(db, 'prompts', params.id), { ...canonical, updatedAt: serverTimestamp() }, { merge: true })
      router.push(`/p/${params.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-[900px] py-8">Loading…</div>

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">Edit Prompt</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Body</label>
          <textarea className="w-full min-h-[200px] rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  )
}

