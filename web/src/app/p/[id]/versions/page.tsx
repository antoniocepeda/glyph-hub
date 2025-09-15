"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'

type Version = { id: string; title: string; body: string; createdAt?: any }

export default function VersionsPage() {
  const params = useParams() as { id: string }
  const [versions, setVersions] = useState<Version[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getDb()
        if (!db) return
        const snaps = await getDocs(query(collection(db, 'prompts', params.id, 'versions'), orderBy('createdAt', 'desc')))
        setVersions(snaps.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      } catch (e: any) {
        setError(e.message || 'Failed to load versions')
      }
    }
    load()
  }, [params.id])

  async function restore(v: Version) {
    try {
      const db = getDb()
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!db || !user) throw new Error('Sign in required')
      await setDoc(doc(db, 'prompts', params.id), { title: v.title, body: v.body, updatedAt: serverTimestamp() }, { merge: true })
      alert('Restored')
    } catch (e: any) {
      alert(e.message || 'Failed to restore')
    }
  }

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">Versions</h1>
      {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
      <div className="space-y-3">
        {versions.map(v => (
          <div key={v.id} className="rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3">
            <div className="text-sm font-medium">{v.title}</div>
            <pre className="text-xs whitespace-pre-wrap mt-2 max-h-40 overflow-auto">{v.body}</pre>
            <button onClick={() => restore(v)} className="mt-2 text-sm text-[var(--gh-cyan)]">Restore</button>
          </div>
        ))}
        {versions.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No versions yet.</div>}
      </div>
    </div>
  )
}


