"use client"
import { useEffect, useMemo, useState } from 'react'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import {
  doc, getDoc, getDocFromCache, getDocFromServer,
  updateDoc, increment, deleteDoc, setDoc,
  collection, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore'
import { getIdTokenResult } from 'firebase/auth'
import type { PromptDoc } from '@/lib/types'

type PromptData = Pick<PromptDoc, 'id' | 'title' | 'body' | 'tags' | 'visibility' | 'ownerId' | 'forkOf' | 'checksum'> & {
  sourceUrl: string | null
  createdByType?: 'anonymous' | 'user'
}

export function usePrompt(promptId: string) {
  const [data, setData] = useState<PromptData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [liked, setLiked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])
  const isSignedIn = Boolean(getFirebaseAuth()?.currentUser)

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      const ref = doc(db, 'prompts', promptId)
      let snap
      try {
        snap = await getDocFromCache(ref)
      } catch {
        snap = await getDocFromServer(ref)
      }
      if (snap.exists()) {
        const d = snap.data() as Partial<PromptData>
        setData({
          id: snap.id,
          title: d.title || '',
          body: d.body || '',
          tags: d.tags || [],
          sourceUrl: (d.sourceUrl as string | null) || null,
          visibility: d.visibility || 'public',
          ownerId: d.ownerId ?? null,
          forkOf: d.forkOf,
          checksum: d.checksum,
        })
        try {
          await updateDoc(ref, { 'stats.views': increment(1) })
        } catch (e) {
          console.warn('[prompt] Failed to increment views', e)
        }
      } else {
        setNotFound(true)
      }

      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (user) {
        try {
          const res = await getIdTokenResult(user)
          type CustomClaims = { role?: string; admin?: boolean }
          const claims = res.claims as unknown as CustomClaims
          setIsAdmin(Boolean(claims.role === 'admin' || claims.admin === true))
        } catch {
          setIsAdmin(false)
        }
        const snaps = await getDocs(query(collection(db, 'collections'), where('ownerId', '==', user.uid)))
        setCollections(snaps.docs.map(d => ({ id: d.id, title: (d.data() as { title?: string }).title || '' })))
        const favDoc = await getDoc(doc(db, 'users', user.uid, 'favorites', promptId))
        setLiked(favDoc.exists())
      }
    }
    load()
  }, [promptId])

  const placeholders = useMemo(() => {
    if (!data?.body) return [] as string[]
    const set = new Set<string>()
    for (const m of data.body.matchAll(/\{\{([^}]+)\}\}/g)) set.add(m[1].trim())
    return Array.from(set)
  }, [data])

  async function toggleLike() {
    try {
      const db = getDb()
      const user = getFirebaseAuth()?.currentUser
      if (!db || !user) return
      const favRef = doc(db, 'users', user.uid, 'favorites', promptId)
      if (!liked) {
        await setDoc(favRef, { promptId, createdAt: new Date() })
        setLiked(true)
        await updateDoc(doc(db, 'prompts', promptId), { 'stats.likes': increment(1) })
      } else {
        await deleteDoc(favRef)
        setLiked(false)
        await updateDoc(doc(db, 'prompts', promptId), { 'stats.likes': increment(-1) })
      }
    } catch (e) {
      console.error('[prompt] Failed to toggle like', e)
    }
  }

  async function forkPrompt(): Promise<string | null> {
    try {
      const db = getDb()
      const user = getFirebaseAuth()?.currentUser
      if (!db || !user || !data) return null
      const newRef = doc(collection(db, 'prompts'))
      await setDoc(newRef, {
        title: data.title,
        body: data.body,
        tags: data.tags || [],
        sourceUrl: data.sourceUrl || null,
        visibility: 'private',
        ownerId: user.uid,
        forkOf: promptId,
        checksum: data.checksum || 'fork',
        stats: { views: 0, copies: 0, likes: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return newRef.id
    } catch (e) {
      console.error('[prompt] Failed to fork', e)
      return null
    }
  }

  async function deletePrompt(): Promise<boolean> {
    try {
      const db = getDb()
      if (!db) return false
      await deleteDoc(doc(db, 'prompts', promptId))
      return true
    } catch (e) {
      console.error('[prompt] Failed to delete', e)
      return false
    }
  }

  async function incrementCopies() {
    try {
      const db = getDb()
      if (db) await updateDoc(doc(db, 'prompts', promptId), { 'stats.copies': increment(1) })
    } catch (e) {
      console.warn('[prompt] Failed to increment copies', e)
    }
  }

  async function addToCollection(collectionId: string) {
    const db = getDb()
    if (!db) throw new Error('No DB')
    await setDoc(doc(db, 'collections', collectionId, 'items', promptId), {
      promptId,
      addedAt: new Date(),
    })
  }

  return {
    data, notFound, liked, isAdmin, isSignedIn,
    collections, placeholders,
    toggleLike, forkPrompt, deletePrompt, incrementCopies, addToCollection,
  }
}
