"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import Link from 'next/link'
import { updateProfile } from 'firebase/auth'

export default function ProfilePage() {
  const params = useParams() as { uid: string }
  type UserDoc = { displayName?: string; bio?: string; preferences?: { theme?: 'system'|'light'|'dark'; defaultVisibility?: 'public'|'unlisted'|'private' } }
  type PromptItem = { id: string; title: string; tags?: string[] }
  type CollectionItem = { id: string; title: string }
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const myUid = useMemo(() => getFirebaseAuth()?.currentUser?.uid || null, [])
  const isOwner = myUid === params.uid

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
      {isOwner && (
        <OwnerEditor
          initial={{
            displayName: userDoc?.displayName || '',
            bio: userDoc?.bio || '',
            theme: userDoc?.preferences?.theme || 'system',
            defaultVisibility: userDoc?.preferences?.defaultVisibility || 'public',
          }}
          onSaved={(next) => setUserDoc(prev => ({ ...(prev || {}), displayName: next.displayName, bio: next.bio, preferences: { ...(prev?.preferences || {}), theme: next.theme, defaultVisibility: next.defaultVisibility } }))}
        />
      )}

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

function OwnerEditor({ initial, onSaved }: { initial: { displayName: string; bio: string; theme: 'system'|'light'|'dark'; defaultVisibility: 'public'|'unlisted'|'private' }, onSaved: (v: { displayName: string; bio: string; theme: 'system'|'light'|'dark'; defaultVisibility: 'public'|'unlisted'|'private' }) => void }) {
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [bio, setBio] = useState(initial.bio)
  const [theme, setTheme] = useState(initial.theme)
  const [defaultVisibility, setDefaultVisibility] = useState(initial.defaultVisibility)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const uid = getFirebaseAuth()?.currentUser?.uid
      if (!uid) throw new Error('Sign in')
      const db = getDb()
      if (!db) throw new Error('No db')
      await setDoc(doc(db, 'users', uid), {
        displayName: displayName || '',
        bio: bio || '',
        preferences: { theme, defaultVisibility },
        updatedAt: serverTimestamp(),
      }, { merge: true })
      // Attempt to keep Firebase Auth profile in sync (best-effort)
      try {
        const authUser = getFirebaseAuth()?.currentUser
        if (authUser) await updateProfile(authUser, { displayName: displayName || '' })
      } catch {}
      onSaved({ displayName, bio, theme, defaultVisibility })
      setMsg('Saved')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-8 p-4 rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Display name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Theme</label>
          <select value={theme} onChange={e => setTheme(e.target.value as 'system'|'light'|'dark')} className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full min-h-[100px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Default visibility</label>
          <select value={defaultVisibility} onChange={e => setDefaultVisibility(e.target.value as 'public'|'unlisted'|'private')} className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm">
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black">{saving ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className="text-sm text-[var(--gh-text-muted)]">{msg}</span>}
      </div>
    </div>
  )
}


