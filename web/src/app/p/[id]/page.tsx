"use client"
import { useEffect, useMemo, useState } from 'react'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, deleteDoc, doc, getDoc, getDocFromCache, getDocFromServer, getDocs, increment, query, updateDoc, where, setDoc, serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { encodeShareCode } from '@/lib/share-code'
import { useParams } from 'next/navigation'
import { copyToClipboard } from '@/lib/utils'

export default function PromptPage() {
  const params = useParams() as { id: string }
  type PromptData = { id: string; title: string; body: string; tags: string[]; sourceUrl: string | null; visibility: 'public' | 'unlisted' | 'private'; ownerId?: string; forkOf?: string; checksum?: string }
  const [data, setData] = useState<PromptData | null>(null)
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])
  const [addStatus, setAddStatus] = useState<string>('')
  const [liked, setLiked] = useState<boolean>(false)
  const isSignedIn = Boolean(getFirebaseAuth()?.currentUser)

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      const ref = doc(db, 'prompts', params.id)
      let snap
      try {
        const t0 = performance.now()
        snap = await getDocFromCache(ref)
        const t1 = performance.now()
        console.debug(`[perf] prompt cache fetch ${Math.round(t1 - t0)}ms`)
      } catch {
        // cache miss — fall back to server
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
          visibility: (d.visibility as 'public' | 'unlisted' | 'private') || 'public',
          ownerId: d.ownerId,
          forkOf: d.forkOf,
          checksum: d.checksum,
        })
        try {
          await updateDoc(ref, { 'stats.views': increment(1) })
        } catch {}
      }
      // Load my collections for add-to-collection
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (user) {
        const snaps = await getDocs(query(collection(db, 'collections'), where('ownerId', '==', user.uid)))
        setCollections(snaps.docs.map(d => ({ id: d.id, title: (d.data() as { title?: string }).title || '' })))
        const favDoc = await getDoc(doc(db, 'users', user.uid, 'favorites', params.id))
        setLiked(favDoc.exists())
      }
    }
    load()
  }, [params.id])

  const placeholders = useMemo(() => {
    if (!data?.body) return [] as string[]
    const set = new Set<string>()
    for (const m of data.body.matchAll(/\{\{([^}]+)\}\}/g)) set.add(m[1].trim())
    return Array.from(set)
  }, [data])

  const [vars, setVars] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<'prompt'|'json'|'code'|'embed'|null>(null)

  function applyVars(text: string): string {
    return (text || '').replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] ?? `{{${k}}}`)
  }

  const shareCode = useMemo(() => {
    if (!data) return ''
    return encodeShareCode({
      title: data.title,
      body: applyVars(data.body),
      tags: data.tags || [],
      sourceUrl: data.sourceUrl || null,
      visibility: data.visibility || 'public',
    })
  }, [data, vars, applyVars])

  if (!data) return <div className="py-8">Loading…</div>

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">{data.title}</h1>
        <div className="relative z-50 flex gap-2 text-sm pointer-events-auto">
          <button
            onClick={async () => {
              await copyToClipboard(applyVars(data.body))
              setCopied('prompt')
              setTimeout(() => setCopied(null), 1500)
              try {
                const db = getDb()
                if (db) await updateDoc(doc(db, 'prompts', params.id), { 'stats.copies': increment(1) })
              } catch {}
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] cursor-pointer"
            type="button"
            >
            {copied === 'prompt' ? 'Copied' : 'Copy Prompt'}
          </button>
          <button
            onClick={async () => {
              const json = JSON.stringify({
                title: data.title,
                body: applyVars(data.body),
                tags: data.tags || [],
                sourceUrl: data.sourceUrl || null,
                visibility: data.visibility || 'public',
              })
              await copyToClipboard(json)
              setCopied('json')
              setTimeout(() => setCopied(null), 1500)
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] cursor-pointer"
            type="button"
            >
            {copied === 'json' ? 'Copied' : 'Copy JSON'}
          </button>
          <button
            onClick={async () => {
              await copyToClipboard(shareCode)
              setCopied('code')
              setTimeout(() => setCopied(null), 1500)
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] cursor-pointer"
            type="button"
            >
            {copied === 'code' ? 'Copied' : 'Copy Share Code'}
          </button>
          <button
            onClick={async () => {
              const code = `<iframe src="${window.location.origin}/embed/p/${params.id}" width="600" height="200" frameborder="0" style="max-width:100%;"></iframe>`
              await copyToClipboard(code)
              setCopied('embed')
              setTimeout(() => setCopied(null), 1500)
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] cursor-pointer"
            type="button"
            >
            {copied === 'embed' ? 'Copied' : 'Copy Embed'}
          </button>
          <Link href={`/p/${params.id}`} className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]">Share URL</Link>
          {(() => {
            const auth = getFirebaseAuth()
            const uid = auth?.currentUser?.uid
            const email = auth?.currentUser?.email || ''
            const canEdit = Boolean(uid && data.ownerId === uid)
            const canDelete = canEdit || email === 'outersloth@gmail.com'
            if (canEdit) {
              return (
                <>
                  <Link href={`/p/${params.id}/edit`} className="text-[var(--gh-cyan)]">Edit</Link>
                  <Link href={`/p/${params.id}/versions`} className="text-[var(--gh-cyan)]">Versions</Link>
                </>
              )
            }
            return null
          })()}
          {isSignedIn && (
          <button
            onClick={async () => {
              try {
                const db = getDb()
                const auth = getFirebaseAuth()
                const user = auth?.currentUser
                if (!db || !user) return
                const favRef = doc(db, 'users', user.uid, 'favorites', params.id)
                if (!liked) {
                  await setDoc(favRef, { promptId: params.id, createdAt: new Date() })
                  setLiked(true)
                  await updateDoc(doc(db, 'prompts', params.id), { 'stats.likes': increment(1) })
                } else {
                  await deleteDoc(favRef)
                  setLiked(false)
                  await updateDoc(doc(db, 'prompts', params.id), { 'stats.likes': increment(-1) })
                }
              } catch {}
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] pointer-events-auto"
          >
            {liked ? '★ Liked' : '☆ Like'}
          </button>
          )}
          {isSignedIn && (
          <button
            onClick={async () => {
              try {
                const db = getDb()
                const auth = getFirebaseAuth()
                const user = auth?.currentUser
                if (!db || !user || !data) return
                const newRef = doc(collection(db, 'prompts'))
                await setDoc(newRef, {
                  title: data.title,
                  body: data.body,
                  tags: data.tags || [],
                  sourceUrl: data.sourceUrl || null,
                  visibility: 'private',
                  ownerId: user.uid,
                  forkOf: params.id,
                  checksum: data.checksum || 'fork',
                  stats: { views: 0, copies: 0, likes: 0 },
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                })
                window.location.href = `/p/${newRef.id}`
              } catch {}
            }}
            className="text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] pointer-events-auto"
          >
            Fork
          </button>
          )}
          {(() => {
            const auth = getFirebaseAuth()
            const uid = auth?.currentUser?.uid
            const email = auth?.currentUser?.email || ''
            const canDelete = Boolean(uid && (data.ownerId === uid || email === 'outersloth@gmail.com'))
            if (!canDelete) return null
            return (
              <button
                onClick={async () => {
                  if (!confirm('Delete this prompt? This cannot be undone.')) return
                  try {
                    const db = getDb()
                    if (!db) return
                    await deleteDoc(doc(db, 'prompts', params.id))
                    window.location.href = '/'
                  } catch {}
                }}
                className="text-red-400 ml-2"
                type="button"
              >
                Delete
              </button>
            )
          })()}
        </div>
      </div>
      {isSignedIn && collections.length > 0 && (
        <div className="mt-3 text-sm flex items-center gap-2">
          <span className="text-[var(--gh-text-muted)]">Add to collection:</span>
          <select
            className="rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-1"
            onChange={async (e) => {
              const colId = e.target.value
              if (!colId) return
              try {
                setAddStatus('Adding...')
                const db = getDb()
                if (!db) throw new Error('No DB')
                await setDoc(doc(db, 'collections', colId, 'items', params.id), {
                  promptId: params.id,
                  addedAt: new Date(),
                })
                setAddStatus('Added')
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed'
                setAddStatus(msg)
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Select collection</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {addStatus && <span className="text-[var(--gh-text-muted)]">{addStatus}</span>}
        </div>
      )}
      <div className="mt-4 text-[var(--gh-text-dim)] text-sm">
        Visibility: {data.visibility}
        {data.forkOf && (
          <>
            {' • '}
            <span>Forked from </span>
            <Link className="text-[var(--gh-cyan)] underline" href={`/p/${data.forkOf}`}>{data.forkOf}</Link>
          </>
        )}
        {data.sourceUrl && (
          <>
            {' • '}
            <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline text-[var(--gh-cyan)]">source</a>
          </>
        )}
      </div>
      {placeholders.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {placeholders.map(k => (
            <div key={k}>
              <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">{k}</label>
              <input
                value={vars[k] || ''}
                onChange={e => setVars({ ...vars, [k]: e.target.value })}
                className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
                placeholder={`Enter ${k}`}
              />
            </div>
          ))}
        </div>
      )}
      <pre className="mt-6 p-4 rounded-[12px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] whitespace-pre-wrap text-sm">{applyVars(data.body)}</pre>
      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.tags.map((t: string) => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]">#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}


