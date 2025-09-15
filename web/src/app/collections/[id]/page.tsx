"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import Link from 'next/link'

export default function PublicCollectionPage() {
  const params = useParams() as { id: string }
  const [title, setTitle] = useState<string>('')
  const [items, setItems] = useState<{ id: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const snap = await getDoc(doc(db, 'collections', params.id))
        if (!snap.exists()) { setError('Not found'); return }
        const data = snap.data() as any
        if (data.visibility !== 'public') { setError('This collection is private'); return }
        setTitle(data.title || 'Collection')
        const itemSnaps = await getDocs(collection(db, 'collections', params.id, 'items'))
        setItems(itemSnaps.docs.map(d => ({ id: (d.data() as any).promptId || d.id })))
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      }
    }
    load()
  }, [params.id])

  if (error) return <div className="mx-auto max-w-[900px] py-8 text-sm text-red-400">{error}</div>

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">{title}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(it => (
          <Link key={it.id} href={`/p/${it.id}`} className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)]">
            <div className="text-sm">Prompt {it.id}</div>
          </Link>
        ))}
        {items.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No items.</div>}
      </div>
    </div>
  )
}


