"use client"
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'
import { seedIfEmptyForUser } from '@/lib/seed'
import { useRouter } from 'next/navigation'
import { ensureAnonymousUser } from '@/lib/auth'
import { collection as fsCollection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import { computeChecksum } from '@/lib/checksum'

type Prompt = {
  id: string
  title: string
  body: string
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
}

export default function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [qText, setQText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      try {
        const auth = getFirebaseAuth()
        let user = auth?.currentUser
        if (!user) user = await ensureAnonymousUser()
        if (user && process.env.NODE_ENV === 'development') {
          await seedIfEmptyForUser(user)
        }
        const col = collection(db, 'prompts')
        const qy = query(col, where('visibility', '==', 'public'))
        const snaps = await getDocs(qy)
        const list = snaps.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Prompt[]
        setPrompts(list)
        // Prefetch top prompt detail pages
        list.slice(0, 6).forEach(p => router.prefetch(`/p/${p.id}`))
      } catch (e: any) {
        console.error('Failed to load prompts', e)
        setError('Unable to load prompts yet. Try creating one.')
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase()
    if (!q) return prompts
    return prompts.filter(p => p.title.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)))
  }, [prompts, qText])

  return (
    <div>
      <section className="py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl">GlyphHub</h1>
        </div>
      </section>

      <section className="mb-8">
        <QuickPaste />
      </section>

      <section className="py-2 mb-6">
        <div className="mt-2">
          <input
            placeholder="Search title or tags"
            value={qText}
            onChange={e => setQText(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm placeholder:text-[var(--gh-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gh-cyan)]/50"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <Link key={p.id} href={`/p/${p.id}`} className="group rounded-[16px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4 shadow-[var(--gh-shadow-1)] hover:shadow-[var(--gh-shadow-2)] transition">
            <h3 className="font-display text-lg mb-2">{p.title}</h3>
            <p className="text-[var(--gh-text-dim)] text-sm line-clamp-3">{p.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.tags || []).map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]">#{t}</span>
              ))}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-[var(--gh-text-muted)]">No prompts found.</div>
        )}
      </section>
    </div>
  )
}

function QuickPaste() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display">Quick Paste</div>
        <Link href="/new" className="text-xs text-[var(--gh-cyan)]">Advanced</Link>
      </div>
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm mb-2"
      />
      <textarea
        placeholder="Paste your prompt..."
        value={body}
        onChange={e => setBody(e.target.value)}
        className="w-full min-h-[100px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
      />
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      <div className="mt-2">
        <button
          disabled={saving || !body.trim()}
          className="rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black"
          onClick={async () => {
            setSaving(true)
            setErr(null)
            try {
              const db = getDb()
              if (!db) throw new Error('No DB')
              await ensureAnonymousUser()
              const id = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)()
              const ref = doc(fsCollection(db, 'prompts'), id)
              await setDoc(ref, {
                title: title || 'Untitled',
                body: body.trim(),
                tags: [],
                sourceUrl: null,
                visibility: 'public',
                ownerId: getFirebaseAuth()?.currentUser?.uid || 'anon',
                checksum: computeChecksum(body.trim()),
                stats: { views: 0, copies: 0, likes: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
              window.location.href = `/p/${id}`
            } catch (e: any) {
              setErr(e.message || 'Failed')
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Saving…' : 'Save' }
        </button>
      </div>
    </div>
  )
}

 
