"use client"
import { useEffect, useState } from 'react'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Link from 'next/link'

type CollectionDoc = {
  id: string
  title: string
  visibility: 'public' | 'private'
}

export default function CollectionsPage() {
  const [items, setItems] = useState<CollectionDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        const auth = getFirebaseAuth()
        const user = auth?.currentUser
        if (!db || !user) return
        const snaps = await getDocs(query(collection(db, 'collections'), where('ownerId', '==', user.uid)))
        setItems(snaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; visibility: 'public' | 'private' }) })))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load collections'
        setError(msg)
      }
    }
    load()
  }, [])

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">My Collections</h1>
        <Link href="/collections/new" className="text-sm text-[var(--gh-cyan)]">New Collection</Link>
      </div>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(c => (
          <Link key={c.id} href={`/collections/${c.id}/edit`} className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)]">
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-[var(--gh-text-muted)]">{c.visibility}</div>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No collections yet.</div>}
      </div>
    </div>
  )
}


