"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { z } from 'zod'
import { CollectionSchema, canonicalizeCollection, type CollectionInput } from '@/lib/validators'

export default function EditCollectionPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [form, setForm] = useState<CollectionInput>({ title: '', visibility: 'private' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<{ id: string; promptId: string }[]>([])
  const [collabEmail, setCollabEmail] = useState('')
  const [collabError, setCollabError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const snap = await getDoc(doc(db, 'collections', params.id))
        if (snap.exists()) {
          const data = snap.data() as any
          setForm({ title: data.title || '', visibility: data.visibility || 'private' })
        }
        const itemSnaps = await getDocs(collection(db, 'collections', params.id, 'items'))
        setItems(itemSnaps.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!user) { setError('Please sign in'); return }
      const parsed = CollectionSchema.parse(form)
      const canonical = canonicalizeCollection(parsed)
      const db = getDb()
      if (!db) throw new Error('No DB')
      await setDoc(doc(db, 'collections', params.id), {
        ...canonical,
        ownerId: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      router.push('/collections')
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message || 'Validation error')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-[720px] py-8">Loading…</div>

  return (
    <div className="mx-auto max-w-[720px] py-8">
      <h1 className="font-display text-2xl mb-4">Edit Collection</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Visibility</label>
          <select
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
            value={form.visibility}
            onChange={e => setForm({ ...form, visibility: e.target.value as CollectionInput['visibility'] })}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">{saving ? 'Saving…' : 'Save'}</button>
      </form>
      <div className="mt-8">
        <h2 className="font-display text-lg mb-2">Collaborators</h2>
        <div className="flex gap-2 items-center">
          <input
            placeholder="user email (viewer/editor)"
            value={collabEmail}
            onChange={e => setCollabEmail(e.target.value)}
            className="rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm flex-1"
          />
          <button
            className="text-sm text-[var(--gh-cyan)]"
            onClick={async () => {
              setCollabError(null)
              try {
                const db = getDb()
                if (!db) throw new Error('No DB')
                const ref = doc(db, 'collections', params.id)
                await setDoc(ref, { collaborators: { [collabEmail.toLowerCase()]: 'viewer' } }, { merge: true })
              } catch (e: any) {
                setCollabError(e.message || 'Failed')
              }
            }}
          >
            Add viewer
          </button>
          <button
            className="text-sm text-[var(--gh-cyan)]"
            onClick={async () => {
              setCollabError(null)
              try {
                const db = getDb()
                if (!db) throw new Error('No DB')
                const ref = doc(db, 'collections', params.id)
                await setDoc(ref, { collaborators: { [collabEmail.toLowerCase()]: 'editor' } }, { merge: true })
              } catch (e: any) {
                setCollabError(e.message || 'Failed')
              }
            }}
          >
            Add editor
          </button>
        </div>
        {collabError && <div className="text-sm text-red-400 mt-2">{collabError}</div>}
      </div>
      <div className="mt-8">
        <h2 className="font-display text-lg mb-2">Items</h2>
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3 text-sm">
              <span>{it.promptId}</span>
              <button
                className="text-[var(--gh-cyan)]"
                onClick={async () => {
                  try {
                    const db = getDb()
                    if (!db) throw new Error('No DB')
                    await deleteDoc(doc(db, 'collections', params.id, 'items', it.id))
                    setItems(prev => prev.filter(p => p.id !== it.id))
                  } catch {}
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No items yet.</div>}
        </div>
      </div>
    </div>
  )
}


