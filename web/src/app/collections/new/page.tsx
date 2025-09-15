"use client"
import { useState } from 'react'
import { z } from 'zod'
import { CollectionSchema, canonicalizeCollection, type CollectionInput } from '@/lib/validators'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import { useRouter } from 'next/navigation'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export default function NewCollectionPage() {
  const [form, setForm] = useState<CollectionInput>({ title: '', visibility: 'private' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

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
      const id = nanoid()
      const db = getDb()
      if (!db) throw new Error('Firebase is not configured. Add .env.local')
      const ref = doc(collection(db, 'collections'), id)
      await setDoc(ref, {
        ...canonical,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      router.push('/collections')
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
    <div className="mx-auto max-w-[720px] py-8">
      <h1 className="font-display text-2xl mb-4">New Collection</h1>
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
        <button type="submit" disabled={saving} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">{saving ? 'Saving…' : 'Create'}</button>
      </form>
    </div>
  )
}


