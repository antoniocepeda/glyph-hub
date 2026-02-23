"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import Link from 'next/link'
import { onIdTokenChanged, updateProfile } from 'firebase/auth'
import { PromptCard, PromptCardSkeleton } from '@/components/PromptCard'
import type { Visibility, PromptStats } from '@/lib/types'

type UserDoc = {
  displayName?: string
  bio?: string
  preferences?: {
    theme?: 'system' | 'light' | 'dark'
    defaultVisibility?: Visibility
  }
}

type PromptItem = {
  id: string
  title: string
  body?: string
  tags?: string[]
  visibility?: Visibility
  stats?: PromptStats
}

type CollectionItem = { id: string; title: string }

type TabId = 'prompts' | 'drafts' | 'liked' | 'collections'

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
}

export default function ProfilePage() {
  const params = useParams() as { uid: string }
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [myDrafts, setMyDrafts] = useState<PromptItem[]>([])
  const [liked, setLiked] = useState<PromptItem[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [authUid, setAuthUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('prompts')

  const isOwner = authUid === params.uid

  useEffect(() => {
    const auth = getFirebaseAuth()
    setAuthUid(auth?.currentUser?.uid || null)
    if (auth) {
      const unsub = onIdTokenChanged(auth, (u) => setAuthUid(u?.uid || null))
      return () => unsub()
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const db = getDb()
        if (!db) return
        const u = await getDoc(doc(db, 'users', params.uid))
        if (u.exists()) setUserDoc(u.data() as UserDoc)

        const pSnaps = await getDocs(
          query(collection(db, 'prompts'), where('ownerId', '==', params.uid), where('visibility', '==', 'public'))
        )
        setPrompts(
          pSnaps.docs.map(d => {
            const data = d.data() as { title: string; body?: string; tags?: string[]; visibility?: Visibility; stats?: PromptStats }
            return { id: d.id, title: data.title, body: data.body, tags: data.tags, visibility: data.visibility, stats: data.stats }
          })
        )

        if (authUid && authUid === params.uid) {
          const mineSnaps = await getDocs(query(collection(db, 'prompts'), where('ownerId', '==', params.uid)))
          const allMine = mineSnaps.docs.map(d => {
            const data = d.data() as { title: string; body?: string; tags?: string[]; visibility?: Visibility; stats?: PromptStats }
            return { id: d.id, title: data.title, body: data.body, tags: data.tags, visibility: data.visibility, stats: data.stats }
          })
          setMyDrafts(allMine.filter(p => p.visibility !== 'public'))
        } else {
          setMyDrafts([])
        }

        try {
          const favSnaps = await getDocs(collection(db, 'users', params.uid, 'favorites'))
          const favIds = favSnaps.docs.map(d => d.id)
          if (favIds.length > 0) {
            const batches: string[][] = []
            for (let i = 0; i < favIds.length; i += 10) batches.push(favIds.slice(i, i + 10))
            const results: PromptItem[] = []
            for (const b of batches) {
              const snaps = await getDocs(query(collection(db, 'prompts'), where('__name__', 'in', b)))
              for (const d of snaps.docs) {
                const data = d.data() as { title?: string; body?: string; tags?: string[]; visibility?: Visibility; stats?: PromptStats }
                if (data.visibility === 'public') {
                  results.push({ id: d.id, title: data.title || '', body: data.body, tags: data.tags || [], visibility: data.visibility, stats: data.stats })
                }
              }
            }
            setLiked(results)
          } else {
            setLiked([])
          }
        } catch (e) {
          console.warn('[profile] Failed to load favorites', e)
        }

        const cSnaps = await getDocs(
          query(collection(db, 'collections'), where('ownerId', '==', params.uid), where('visibility', '==', 'public'))
        )
        setCollections(cSnaps.docs.map(d => ({ id: d.id, ...(d.data() as { title: string }) })))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load profile'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.uid, authUid])

  const totalLikes = useMemo(
    () => prompts.reduce((acc, p) => acc + (p.stats?.likes ?? 0), 0),
    [prompts]
  )

  const tabs = useMemo(() => {
    const t: { id: TabId; label: string; count: number }[] = [
      { id: 'prompts', label: 'Prompts', count: prompts.length },
    ]
    if (isOwner) {
      t.push({ id: 'drafts', label: 'Drafts', count: myDrafts.length })
    }
    t.push({ id: 'liked', label: 'Liked', count: liked.length })
    t.push({ id: 'collections', label: 'Collections', count: collections.length })
    return t
  }, [prompts.length, myDrafts.length, liked.length, collections.length, isOwner])

  if (error) {
    return <div className="mx-auto max-w-[900px] py-8 text-red-400 text-sm">{error}</div>
  }

  return (
    <div className="mx-auto max-w-[900px] py-8">
      {/* ── Profile Header ── */}
      {loading ? (
        <ProfileHeaderSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
          {/* Avatar */}
          <div className="shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-[var(--gh-cyan)] to-[var(--gh-violet)] p-[3px]">
            <div className="w-full h-full rounded-full bg-[var(--gh-surface)] flex items-center justify-center">
              <span className="font-display text-2xl text-[var(--gh-text)]">
                {getInitials(userDoc?.displayName)}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl truncate">
                {userDoc?.displayName || 'User'}
              </h1>
              {isOwner && (
                <>
                  <Link
                    href="/new"
                    className="shrink-0 rounded-[10px] px-3 py-1.5 text-xs bg-[var(--gh-cyan)] text-black font-medium hover:brightness-110 transition"
                  >
                    New Prompt
                  </Link>
                  <button
                    onClick={() => setEditing(v => !v)}
                    className="shrink-0 rounded-[10px] px-3 py-1.5 text-xs border border-[var(--gh-border)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] transition-colors"
                  >
                    {editing ? 'Close' : 'Edit profile'}
                  </button>
                </>
              )}
            </div>
            {userDoc?.bio && (
              <p className="text-sm text-[var(--gh-text-dim)] mb-3 max-w-[600px]">{userDoc.bio}</p>
            )}
            <div className="flex gap-5 text-sm">
              <div>
                <span className="font-display text-lg text-[var(--gh-text)]">{prompts.length}</span>
                <span className="ml-1 text-[var(--gh-text-muted)]">prompts</span>
              </div>
              <div>
                <span className="font-display text-lg text-[var(--gh-text)]">{totalLikes}</span>
                <span className="ml-1 text-[var(--gh-text-muted)]">likes</span>
              </div>
              <div>
                <span className="font-display text-lg text-[var(--gh-text)]">{collections.length}</span>
                <span className="ml-1 text-[var(--gh-text-muted)]">collections</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit panel (collapsible) ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOwner && editing ? '600px' : '0px', opacity: isOwner && editing ? 1 : 0 }}
      >
        {isOwner && editing && (
          <OwnerEditor
            initial={{
              displayName: userDoc?.displayName || '',
              bio: userDoc?.bio || '',
              theme: userDoc?.preferences?.theme || 'system',
              defaultVisibility: userDoc?.preferences?.defaultVisibility || 'public',
            }}
            onSaved={(next) =>
              setUserDoc(prev => ({
                ...(prev || {}),
                displayName: next.displayName,
                bio: next.bio,
                preferences: { ...(prev?.preferences || {}), theme: next.theme, defaultVisibility: next.defaultVisibility },
              }))
            }
          />
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[var(--gh-border)] mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--gh-cyan)]'
                : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${activeTab === tab.id ? 'text-[var(--gh-cyan)]' : 'text-[var(--gh-text-muted)]'}`}>
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--gh-cyan)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PromptCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'prompts' && (
            <TabContent
              items={prompts}
              emptyText="No public prompts yet."
              renderItem={(p) => (
                <PromptCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  body={p.body}
                  tags={p.tags}
                  stats={p.stats}
                  showStats
                  variant="compact"
                />
              )}
            />
          )}

          {activeTab === 'drafts' && isOwner && (
            <TabContent
              items={myDrafts}
              emptyText="No drafts or unlisted prompts."
              renderItem={(p) => (
                <PromptCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  body={p.body}
                  tags={p.tags}
                  visibility={p.visibility}
                  stats={p.stats}
                  showVisibilityBadge
                  showStats
                  showActions
                  variant="full"
                />
              )}
            />
          )}

          {activeTab === 'liked' && (
            <TabContent
              items={liked}
              emptyText="No liked prompts yet."
              renderItem={(p) => (
                <PromptCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  body={p.body}
                  tags={p.tags}
                  stats={p.stats}
                  showStats
                  variant="compact"
                />
              )}
            />
          )}

          {activeTab === 'collections' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collections.length === 0 && (
                <p className="text-sm text-[var(--gh-text-muted)] col-span-full py-8 text-center">
                  No public collections.
                </p>
              )}
              {collections.map(c => (
                <Link
                  key={c.id}
                  href={`/collections/${c.id}`}
                  className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)] hover:shadow-[var(--gh-shadow-2)] transition-shadow"
                >
                  <div className="font-medium">{c.title}</div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabContent<T extends { id: string }>({
  items,
  emptyText,
  renderItem,
}: {
  items: T[]
  emptyText: string
  renderItem: (item: T) => React.ReactNode
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--gh-text-muted)] py-8 text-center">{emptyText}</p>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(renderItem)}
    </div>
  )
}

function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-5 mb-8 animate-pulse">
      <div className="shrink-0 w-20 h-20 rounded-full bg-[var(--gh-surface)]" />
      <div className="flex-1 space-y-3">
        <div className="h-6 w-48 rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-72 rounded bg-[var(--gh-surface)]" />
        <div className="flex gap-5">
          <div className="h-5 w-20 rounded bg-[var(--gh-surface)]" />
          <div className="h-5 w-16 rounded bg-[var(--gh-surface)]" />
          <div className="h-5 w-24 rounded bg-[var(--gh-surface)]" />
        </div>
      </div>
    </div>
  )
}

function OwnerEditor({
  initial,
  onSaved,
}: {
  initial: { displayName: string; bio: string; theme: 'system' | 'light' | 'dark'; defaultVisibility: Visibility }
  onSaved: (v: { displayName: string; bio: string; theme: 'system' | 'light' | 'dark'; defaultVisibility: Visibility }) => void
}) {
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
      await setDoc(
        doc(db, 'users', uid),
        {
          displayName: displayName || '',
          bio: bio || '',
          preferences: { theme, defaultVisibility },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      try {
        const authUser = getFirebaseAuth()?.currentUser
        if (authUser) await updateProfile(authUser, { displayName: displayName || '' })
      } catch (e) {
        console.warn('[profile] Failed to sync auth displayName', e)
      }
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
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Theme</label>
          <select
            value={theme}
            onChange={e => setTheme(e.target.value as 'system' | 'light' | 'dark')}
            className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="w-full min-h-[100px] rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Default visibility</label>
          <select
            value={defaultVisibility}
            onChange={e => setDefaultVisibility(e.target.value as Visibility)}
            className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        {msg && <span className="text-sm text-[var(--gh-text-muted)]">{msg}</span>}
      </div>
    </div>
  )
}
