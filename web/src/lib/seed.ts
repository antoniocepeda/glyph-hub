import { getDb } from './firebase'
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export async function seedIfEmptyForUser(user: User): Promise<boolean> {
  if (!user) return false
  if (process.env.NODE_ENV !== 'development') return false
  const db = getDb()
  if (!db) return false

  const qy = query(collection(db, 'prompts'), where('ownerId', '==', user.uid), limit(1))
  const snaps = await getDocs(qy)
  const hasPrompts = !snaps.empty

  const examples = [
    {
      title: 'Welcome to GlyphHub',
      body: 'Try creating your first prompt on the /new page.',
      tags: ['welcome'],
      sourceUrl: null as string | null,
      visibility: 'public' as const,
    },
    {
      title: 'How to: Share Code',
      body: 'Use the Copy Share Code button on a prompt detail page.',
      tags: ['howto'],
      sourceUrl: null as string | null,
      visibility: 'public' as const,
    },
  ]

  if (!hasPrompts) {
    for (const ex of examples) {
      const id = nanoid()
      const refDoc = doc(collection(db, 'prompts'), id)
      await setDoc(refDoc, {
        ...ex,
        ownerId: user.uid,
        checksum: 'seed',
        stats: { views: 0, copies: 0, likes: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  // Ensure the user has at least one collection
  const colQ = query(collection(db, 'collections'), where('ownerId', '==', user.uid), limit(1))
  const colSnaps = await getDocs(colQ)
  if (colSnaps.empty) {
    const colId = nanoid()
    const colRef = doc(collection(db, 'collections'), colId)
    await setDoc(colRef, {
      title: 'My First Collection',
      ownerId: user.uid,
      visibility: 'private',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return !hasPrompts || colSnaps.empty
}


