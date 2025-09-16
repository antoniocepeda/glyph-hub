"use client"
import { useEffect, useMemo, useState } from 'react'
import { collection, doc as fsDoc, getDoc as fsGetDoc, getDocs, query, where } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection as fsCollection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import { computeChecksum } from '@/lib/checksum'

type Prompt = {
  id: string
  title: string
  body: string
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  stats?: { views?: number; copies?: number; likes?: number }
}

function engagementScore(p: Prompt): number {
  const s = p.stats || {}
  return (s.likes || 0) * 3 + (s.copies || 0) * 2 + (s.views || 0)
}

export default function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      try {
        const col = collection(db, 'prompts')
        const qy = query(col, where('visibility', '==', 'public'))
        const snaps = await getDocs(qy)
        const list = snaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string; body: string; tags: string[]; visibility: 'public' | 'unlisted' | 'private'; stats?: Prompt['stats'] }) })) as Prompt[]
        setPrompts(list)
        // Prefetch prompt detail pages for snappy navigation
        list.slice(0, 6).forEach(p => router.prefetch(`/p/${p.id}`))
      } catch (e) {
        console.error('Failed to load prompts', e)
        setError('Unable to load prompts yet. Try creating one.')
      }
    }
    load()
  }, [])

  const topThree = useMemo(() => {
    return prompts.slice().sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 3)
  }, [prompts])

  return (
    <div>
      <section className="mb-8">
        <QuickPaste />
      </section>
      {topThree.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl mb-3 text-[var(--gh-text-dim)]">Trending</h2>
          <div className="mb-3 text-sm">
            <Link href="/public" className="text-[var(--gh-cyan)] hover:underline underline-offset-2">Browse all public prompts</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topThree.map(p => (
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
          </div>
        </section>
      )}
    </div>
  )
}

function QuickPaste() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [tagsValue, setTagsValue] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [preferredModel, setPreferredModel] = useState('')
  const [description, setDescription] = useState('')
  const [howToUse, setHowToUse] = useState('')

  const canPrivate = !!getFirebaseAuth()?.currentUser
  useEffect(() => {
    if (!canPrivate && visibility === 'private') {
      setVisibility('public')
    }
  }, [canPrivate, visibility])

  // Load default visibility from user preferences
  useEffect(() => {
    async function loadPref() {
      const uid = getFirebaseAuth()?.currentUser?.uid
      if (!uid) return
      const db = getDb()
      if (!db) return
      try {
        const userSnap = await fsGetDoc(fsDoc(db, 'users', uid))
        if (userSnap.exists()) {
          const data = userSnap.data() as { preferences?: { defaultVisibility?: 'public'|'unlisted'|'private' } }
          const pref = data.preferences
          if (pref?.defaultVisibility && ['public','unlisted','private'].includes(pref.defaultVisibility)) {
            setVisibility(pref.defaultVisibility)
          }
        }
      } catch {}
    }
    loadPref()
  }, [])

  return (
    <div className="rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display">New Prompt</div>
        <button type="button" onClick={() => setAdvanced(v => !v)} className="text-xs text-[var(--gh-cyan)]">
          {advanced ? 'Basic' : 'Advanced'}
        </button>
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
      {advanced && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Tags (comma separated)</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={tagsValue}
              onChange={e => setTagsValue(e.target.value)}
              placeholder="writing, brainstorming"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Source URL (optional)</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Preferred Model</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={preferredModel}
              onChange={e => setPreferredModel(e.target.value)}
              placeholder="e.g., gpt-4o, llama-3-70b, claude-3.5"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Description</label>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">How To Use</label>
            <textarea
              className="w-full min-h-[120px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
              value={howToUse}
              onChange={e => setHowToUse(e.target.value)}
              placeholder="Step-by-step guidance"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Visibility</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                Public
              </label>
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={visibility === 'unlisted'} onChange={() => setVisibility('unlisted')} />
                Unlisted
              </label>
              <div className={`inline-flex items-center gap-1 text-sm ${!canPrivate ? 'opacity-50' : ''}`}>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={visibility === 'private'} onChange={() => canPrivate && setVisibility('private')} disabled={!canPrivate} />
                  Private
                </label>
                {!canPrivate && (
                  <Link href="/login" className="ml-2 text-xs text-[var(--gh-text-muted)] hover:underline underline-offset-2">Sign in</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      <div className="mt-2">
        <button
          disabled={saving || !body.trim()}
          className="rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black"
          onClick={async () => {
            setSaving(true)
            setErr(null)
            try {
              const vis = advanced ? visibility : 'public'
              const user = getFirebaseAuth()?.currentUser
              if (!user && vis === 'private') {
                throw new Error('Please sign in to save as private')
              }

              if (!user) {
                const db = getDb()
                if (!db) throw new Error('No DB')
                const id = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)()
                const ref = doc(fsCollection(db, 'prompts'), id)
                const tags = advanced ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) : []
                const src = advanced && sourceUrl.trim() ? sourceUrl.trim() : null
                const extras: Record<string, unknown> = {}
                if (advanced) {
                  if (preferredModel.trim()) extras.preferredModel = preferredModel.trim()
                  if (description.trim()) extras.description = description.trim()
                  if (howToUse.trim()) extras.howToUse = howToUse.trim()
                }
                await setDoc(ref, {
                  title: title || 'Untitled',
                  body: body.trim(),
                  tags,
                  sourceUrl: src,
                  visibility: vis,
                  ownerId: 'anon',
                  checksum: computeChecksum(body.trim()),
                  stats: { views: 0, copies: 0, likes: 0 },
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  ...extras,
                })
                window.location.href = `/p/${id}`
              } else {
                const db = getDb()
                if (!db) throw new Error('No DB')
                const id = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)()
                const ref = doc(fsCollection(db, 'prompts'), id)
                const tags = advanced ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) : []
                const src = advanced && sourceUrl.trim() ? sourceUrl.trim() : null
                const extras: Record<string, unknown> = {}
                if (advanced) {
                  if (preferredModel.trim()) extras.preferredModel = preferredModel.trim()
                  if (description.trim()) extras.description = description.trim()
                  if (howToUse.trim()) extras.howToUse = howToUse.trim()
                }
                await setDoc(ref, {
                  title: title || 'Untitled',
                  body: body.trim(),
                  tags,
                  sourceUrl: src,
                  visibility: vis,
                  ownerId: user.uid,
                  checksum: computeChecksum(body.trim()),
                  stats: { views: 0, copies: 0, likes: 0 },
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  ...extras,
                })
                window.location.href = `/p/${id}`
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Failed'
              setErr(msg)
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

 
