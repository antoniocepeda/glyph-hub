"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'

type Chat = {
  id: string
  title: string
  model: string
  updatedAt?: Date
  messages?: { role: 'system'|'user'|'assistant'; content: string }[]
}

export default function ChatsPage() {
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [error, setError] = useState<string>('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const auth = getFirebaseAuth()
      const uid = auth?.currentUser?.uid
      if (!uid) {
        setChats([])
        setError('Sign in to see your chats.')
        setLoading(false)
        return
      }
      const db = getDb()
      if (!db) {
        setError('Database not initialized.')
        setLoading(false)
        return
      }
      const snaps = await getDocs(query(
        collection(db, 'chats'),
        where('ownerId', '==', uid),
        orderBy('updatedAt', 'desc'),
        limit(50),
      ))
      const items: Chat[] = snaps.docs.map(d => {
        const data = d.data() as { title?: string; model?: string; updatedAt?: { toDate?: () => Date }; messages?: Chat['messages'] }
        const ts = data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt instanceof Date ? data.updatedAt : undefined)
        return {
          id: d.id,
          title: data.title || 'Chat',
          model: data.model || '',
          updatedAt: ts,
          messages: Array.isArray(data.messages) ? data.messages : [],
        }
      })
      setChats(items)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load chats'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="mx-auto max-w-[900px] py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">My Chats</h1>
        <div className="flex items-center gap-2">
          <Link href="/chat" className="text-[var(--gh-cyan)]">New Chat</Link>
          <button onClick={load} className="text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]">Refresh</button>
        </div>
      </div>
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      {loading && <div className="mt-4 text-sm">Loading…</div>}
      {!loading && chats.length === 0 && !error && (
        <div className="mt-4 text-sm text-[var(--gh-text-muted)]">No chats yet.</div>
      )}
      <div className="mt-4 grid gap-3">
        {chats.map((c) => (
          <div key={c.id} className="rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-bg-soft)] p-3 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">
                <Link href={`/chat?cid=${c.id}`} className="text-[var(--gh-cyan)] underline">{c.title || 'Chat'}</Link>
              </div>
              <div className="text-xs text-[var(--gh-text-muted)] mt-1">
                {c.model}
                {c.updatedAt && <> • {c.updatedAt.toLocaleString()}</>}
              </div>
              {Array.isArray(c.messages) && c.messages.length > 0 && (
                <div className="text-sm text-[var(--gh-text-dim)] mt-2 line-clamp-2">
                  {(() => {
                    const firstUser = c.messages.find(m => m.role === 'user')
                    const lastAssistant = [...c.messages].reverse().find(m => m.role === 'assistant')
                    return firstUser?.content || lastAssistant?.content || ''
                  })()}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <button
                className="text-sm text-red-400"
                onClick={async () => {
                  if (!confirm('Delete this chat?')) return
                  try {
                    const db = getDb()
                    if (!db) return
                    await deleteDoc(doc(db, 'chats', c.id))
                    setChats(prev => prev.filter(x => x.id !== c.id))
                  } catch (e) {
                    console.error('[chats] Failed to delete chat', e)
                  }
                }}
              >Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

