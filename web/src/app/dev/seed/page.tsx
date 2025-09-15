"use client"
import { getDb, getFirebaseAuth, getStorage } from '@/lib/firebase'
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'

export default function SeedPage() {
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState<string | null>(null)

  async function runSeed() {
    setStatus('Seeding...')
    setError(null)
    try {
      const auth = getFirebaseAuth()
      const db = getDb()
      const storage = getStorage()
      if (!auth || !db || !storage) throw new Error('Firebase not configured')

      try {
        await signInWithEmailAndPassword(auth, 'demo@glyphhub.local', 'glyphhub-demo')
      } catch (e) {
        await createUserWithEmailAndPassword(auth, 'demo@glyphhub.local', 'glyphhub-demo')
      }

      const fileRef = ref(storage, 'seed/hello.txt')
      await uploadString(fileRef, 'Hello GlyphHub!')
      const fileUrl = await getDownloadURL(fileRef)

      const examples = [
        {
          id: 'welcome-1',
          title: 'Welcome to GlyphHub',
          body: 'Try creating your first prompt on the /new page.',
          tags: ['welcome'],
          sourceUrl: fileUrl,
          visibility: 'public',
        },
        {
          id: 'howto-1',
          title: 'How to: Share Code',
          body: 'Use the Copy Share Code button on a prompt detail page.',
          tags: ['howto'],
          sourceUrl: null,
          visibility: 'public',
        },
      ]

      for (const ex of examples) {
        const refDoc = doc(collection(db, 'prompts'), ex.id)
        await setDoc(refDoc, {
          ...ex,
          ownerId: auth.currentUser?.uid ?? 'demo',
          checksum: 'seed',
          stats: { views: 0, copies: 0, likes: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      setStatus('Seeding complete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Seed failed'
      setError(msg)
      setStatus('Failed')
    }
  }

  return (
    <div className="mx-auto max-w-[640px] py-10">
      <h1 className="font-display text-2xl mb-4">Dev Seed</h1>
      <p className="text-sm text-[var(--gh-text-dim)] mb-4">Creates a demo user and adds sample prompts + uploads a small file to Storage.</p>
      <button onClick={runSeed} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">Run seed</button>
      <div className="mt-4 text-sm">
        <div>Status: {status}</div>
        {error && <div className="text-red-400">{error}</div>}
      </div>
    </div>
  )
}


