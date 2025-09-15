"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams() as { uid: string }
  type UserDoc = { displayName?: string }
  type PromptItem = { id: string; title: string; tags?: string[] }
  type CollectionItem = { id: string; title: string }
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const u = await getDoc(doc(db, 'users', params.uid))
        if (u.exists()) setUserDoc(u.data() as UserDoc)
        const pSnaps = await getDocs(query(collection(db, 'prompts'), where('ownerId', '==', params.uid), where('visibility', '==', 'public')))
        setPrompts(pSnaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; tags?: string[] }) })))
        const cSnaps = await getDocs(query(collection(db, 'collections'), where('ownerId', '==', params.uid), where('visibility', '==', 'public')))
        setCollections(cSnaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string }) })))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load profile'
        setError(msg)
      }
    }
    load()
  }, [params.uid])

  if (error) return <div className="mx-auto max-w-[900px] py-8 text-red-400 text-sm">{error}</div>

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-1">{userDoc?.displayName || 'User'}</h1>
      <div className="text-sm text-[var(--gh-text-muted)] mb-6">uid: {params.uid}</div>

      <div className="mb-6 text-sm">
        <Link href="/help" className="text-[var(--gh-cyan)]">Browse the Help Center</Link>
      </div>

      <h2 className="font-display text-xl mb-3">Public Prompts</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {prompts.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)]">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-[var(--gh-text-muted)]">{(p.tags || []).join(', ')}</div>
          </Link>
        ))}
        {prompts.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No public prompts.</div>}
      </div>

      <h2 className="font-display text-xl mt-8 mb-3">Public Collections</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {collections.map(c => (
          <Link key={c.id} href={`/collections/${c.id}`} className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)]">
            <div className="font-medium">{c.title}</div>
          </Link>
        ))}
        {collections.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No public collections.</div>}
      </div>
    </div>
  )
}


