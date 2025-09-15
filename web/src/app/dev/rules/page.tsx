"use client"
import { useState } from 'react'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

export default function RulesTestPage() {
  const [status, setStatus] = useState<string>('Idle')
  const [error, setError] = useState<string | null>(null)

  async function testPublicRead() {
    setStatus('Testing public read...')
    setError(null)
    try {
      const db = getDb()
      if (!db) throw new Error('No DB')
      const ref = doc(db, 'prompts', 'welcome-1')
      await getDoc(ref)
      setStatus('Public read OK')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Public read failed'
      setError(msg)
      setStatus('Failed')
    }
  }

  async function testOwnerWrite() {
    setStatus('Testing owner write...')
    setError(null)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!user) throw new Error('Sign in required')
      const db = getDb()
      if (!db) throw new Error('No DB')
      const ref = doc(collection(db, 'prompts'))
      await setDoc(ref, {
        title: 'Rules Test',
        body: 'Owner write should be allowed',
        tags: [],
        sourceUrl: null,
        visibility: 'private',
        ownerId: user.uid,
        checksum: 'rules-test',
        stats: { views: 0, copies: 0, likes: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setStatus('Owner write OK')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Owner write failed'
      setError(msg)
      setStatus('Failed')
    }
  }

  async function testUnauthorizedWrite() {
    setStatus('Testing unauthorized write (should fail)...')
    setError(null)
    try {
      const db = getDb()
      if (!db) throw new Error('No DB')
      const ref = doc(collection(db, 'prompts'))
      await setDoc(ref, {
        title: 'Should fail',
        body: 'No owner / not signed in',
        tags: [],
        sourceUrl: null,
        visibility: 'private',
        ownerId: 'someone-else',
        checksum: 'fail',
        stats: { views: 0, copies: 0, likes: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setStatus('Unexpectedly succeeded')
    } catch (e) {
      setStatus('Unauthorized write correctly blocked')
    }
  }

  return (
    <div className="mx-auto max-w-[640px] py-10">
      <h1 className="font-display text-2xl mb-4">Dev: Rules Test</h1>
      <div className="flex gap-2">
        <button onClick={testPublicRead} className="rounded-[12px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black">Public read</button>
        <button onClick={testOwnerWrite} className="rounded-[12px] px-3 py-2 text-sm border border-[var(--gh-border)]">Owner write</button>
        <button onClick={testUnauthorizedWrite} className="rounded-[12px] px-3 py-2 text-sm border border-[var(--gh-border)]">Unauthorized write</button>
      </div>
      <div className="mt-4 text-sm">
        <div>Status: {status}</div>
        {error && <div className="text-red-400">{error}</div>}
      </div>
    </div>
  )
}


