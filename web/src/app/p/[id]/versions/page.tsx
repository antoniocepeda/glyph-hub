"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import {
  collection, doc, getDoc, getDocs, orderBy, query,
  serverTimestamp, setDoc, type Timestamp,
} from 'firebase/firestore'

type VersionDoc = {
  id: string
  title: string
  body: string
  tags: string[]
  visibility: string
  sourceUrl: string | null
  authorId?: string
  createdAt?: Date
  note?: string
}

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string }

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  const lcs = buildLCS(oldLines, newLines)

  let oi = 0
  let ni = 0
  let li = 0

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length && oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ type: 'same', text: lcs[li] })
      oi++; ni++; li++
    } else if (li < lcs.length && oi < oldLines.length && oldLines[oi] !== lcs[li]) {
      result.push({ type: 'remove', text: oldLines[oi] })
      oi++
    } else if (li < lcs.length && ni < newLines.length && newLines[ni] !== lcs[li]) {
      result.push({ type: 'add', text: newLines[ni] })
      ni++
    } else if (li >= lcs.length && oi < oldLines.length) {
      result.push({ type: 'remove', text: oldLines[oi] })
      oi++
    } else if (li >= lcs.length && ni < newLines.length) {
      result.push({ type: 'add', text: newLines[ni] })
      ni++
    } else {
      break
    }
  }

  return result
}

function buildLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return []
  if (m * n > 50000) {
    return a.filter(line => b.includes(line))
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--; j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  return result
}

export default function VersionsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [versions, setVersions] = useState<VersionDoc[]>([])
  const [current, setCurrent] = useState<VersionDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const auth = getFirebaseAuth()
        const uid = auth?.currentUser?.uid
        if (!uid) {
          setUnauthorized(true)
          setLoading(false)
          return
        }
        const db = getDb()
        if (!db) return

        const promptSnap = await getDoc(doc(db, 'prompts', params.id))
        if (!promptSnap.exists()) {
          setError('Prompt not found.')
          setLoading(false)
          return
        }
        const promptData = promptSnap.data() as {
          title?: string; body?: string; tags?: string[]
          visibility?: string; sourceUrl?: string | null
          ownerId?: string; updatedAt?: Timestamp
        }
        if (promptData.ownerId !== uid) {
          setUnauthorized(true)
          setLoading(false)
          return
        }

        setCurrent({
          id: 'current',
          title: promptData.title || '',
          body: promptData.body || '',
          tags: promptData.tags || [],
          visibility: promptData.visibility || 'public',
          sourceUrl: promptData.sourceUrl ?? null,
          createdAt: promptData.updatedAt?.toDate?.() ?? undefined,
        })

        const vSnaps = await getDocs(
          query(
            collection(db, 'prompts', params.id, 'versions'),
            orderBy('createdAt', 'desc'),
          )
        )
        const vList: VersionDoc[] = vSnaps.docs.map(d => {
          const data = d.data() as {
            title?: string; body?: string; tags?: string[]
            visibility?: string; sourceUrl?: string | null
            authorId?: string; createdAt?: Timestamp; note?: string
          }
          return {
            id: d.id,
            title: data.title || '',
            body: data.body || '',
            tags: data.tags || [],
            visibility: data.visibility || 'public',
            sourceUrl: data.sourceUrl ?? null,
            authorId: data.authorId,
            createdAt: data.createdAt?.toDate?.() ?? undefined,
            note: data.note,
          }
        })
        setVersions(vList)
      } catch (e) {
        console.error('[versions] Failed to load', e)
        setError(e instanceof Error ? e.message : 'Failed to load versions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function restoreVersion(version: VersionDoc) {
    setRestoring(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!user) throw new Error('Sign in required')
      const db = getDb()
      if (!db) throw new Error('No DB')

      const snapshot = {
        title: current?.title || '',
        body: current?.body || '',
        tags: current?.tags || [],
        sourceUrl: current?.sourceUrl ?? null,
        visibility: current?.visibility || 'public',
      }
      const verRef = doc(collection(db, 'prompts', params.id, 'versions'))
      await setDoc(verRef, {
        ...snapshot,
        authorId: user.uid,
        note: 'Snapshot before restore',
        createdAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'prompts', params.id), {
        title: version.title,
        body: version.body,
        tags: version.tags,
        sourceUrl: version.sourceUrl,
        visibility: version.visibility,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      router.push(`/p/${params.id}`)
    } catch (e) {
      console.error('[versions] Failed to restore', e)
      setError(e instanceof Error ? e.message : 'Failed to restore')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-[900px] py-8">Loading version history…</div>
  if (unauthorized) return (
    <div className="mx-auto max-w-[900px] py-8 text-sm text-red-400">
      Sign in as the prompt owner to view version history.
    </div>
  )

  const selected = selectedIdx !== null ? versions[selectedIdx] : null
  const previousVersion = selectedIdx !== null && selectedIdx < versions.length - 1
    ? versions[selectedIdx + 1]
    : null
  const diffBase = previousVersion || { title: '', body: '', tags: [] as string[] }
  const diffLines = selected ? computeLineDiff(diffBase.body, selected.body) : []

  return (
    <div className="mx-auto max-w-[1000px] py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl">Version History</h1>
          <p className="text-sm text-[var(--gh-text-muted)] mt-1">
            <Link href={`/p/${params.id}`} className="text-[var(--gh-cyan)] hover:underline">{current?.title || 'Prompt'}</Link>
            {' — '}{versions.length} version{versions.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Link href={`/p/${params.id}/edit`} className="rounded-[10px] px-4 py-2 text-sm border border-[var(--gh-border)] hover:text-[var(--gh-cyan)]">
          Edit prompt
        </Link>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {versions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--gh-text-muted)] mb-2">No version history yet.</p>
          <p className="text-sm text-[var(--gh-text-muted)]">Versions are created automatically when you edit a prompt.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Version list */}
        <div className="space-y-2 max-h-[70vh] overflow-auto">
          {/* Current version (live) */}
          {current && (
            <button
              onClick={() => setSelectedIdx(null)}
              className={`w-full text-left rounded-[12px] p-3 border transition ${
                selectedIdx === null
                  ? 'border-[var(--gh-cyan)] bg-[var(--gh-surface)]'
                  : 'border-[var(--gh-border)] bg-[var(--gh-bg-soft)] hover:border-[var(--gh-cyan)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current (live)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">live</span>
              </div>
              {current.createdAt && (
                <div className="text-xs text-[var(--gh-text-muted)] mt-1">{current.createdAt.toLocaleString()}</div>
              )}
            </button>
          )}

          {versions.map((v, idx) => (
            <button
              key={v.id}
              onClick={() => setSelectedIdx(idx)}
              className={`w-full text-left rounded-[12px] p-3 border transition ${
                selectedIdx === idx
                  ? 'border-[var(--gh-cyan)] bg-[var(--gh-surface)]'
                  : 'border-[var(--gh-border)] bg-[var(--gh-bg-soft)] hover:border-[var(--gh-cyan)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium line-clamp-1">{v.title || 'Untitled'}</span>
                <span className="text-[10px] text-[var(--gh-text-muted)] shrink-0 ml-2">v{versions.length - idx}</span>
              </div>
              {v.note && <div className="text-xs text-[var(--gh-text-dim)] mt-1 line-clamp-1">{v.note}</div>}
              {v.createdAt && (
                <div className="text-xs text-[var(--gh-text-muted)] mt-1">{v.createdAt.toLocaleString()}</div>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="rounded-[14px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-5">
          {selectedIdx === null && current ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg">Current Version</h2>
                <span className="text-xs text-green-400">Live</span>
              </div>
              <div className="mb-3">
                <span className="text-xs text-[var(--gh-text-muted)]">Title</span>
                <div className="text-sm mt-1">{current.title}</div>
              </div>
              <div className="mb-3">
                <span className="text-xs text-[var(--gh-text-muted)]">Visibility</span>
                <div className="text-sm mt-1">{current.visibility}</div>
              </div>
              {current.tags.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-[var(--gh-text-muted)]">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {current.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)]">#{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-[var(--gh-text-muted)]">Body</span>
                <pre className="mt-1 p-3 rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] whitespace-pre-wrap text-sm max-h-[400px] overflow-auto">
                  {current.body}
                </pre>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg">Version {versions.length - selectedIdx!}</h2>
                <button
                  onClick={() => restoreVersion(selected)}
                  disabled={restoring}
                  className="rounded-[10px] px-3 py-1.5 text-sm bg-[var(--gh-cyan)] text-black disabled:opacity-50"
                >
                  {restoring ? 'Restoring…' : 'Restore this version'}
                </button>
              </div>
              {selected.note && (
                <div className="mb-3 text-sm text-[var(--gh-text-dim)] italic">{selected.note}</div>
              )}
              {selected.createdAt && (
                <div className="mb-3 text-xs text-[var(--gh-text-muted)]">{selected.createdAt.toLocaleString()}</div>
              )}

              {/* Title change */}
              {diffBase.title !== selected.title && (
                <div className="mb-3">
                  <span className="text-xs text-[var(--gh-text-muted)]">Title changed</span>
                  <div className="mt-1 text-sm">
                    <span className="line-through text-red-400/70">{diffBase.title || '(empty)'}</span>
                    {' → '}
                    <span className="text-green-400">{selected.title}</span>
                  </div>
                </div>
              )}

              {/* Tags change */}
              {JSON.stringify(diffBase.tags) !== JSON.stringify(selected.tags) && (
                <div className="mb-3">
                  <span className="text-xs text-[var(--gh-text-muted)]">Tags changed</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diffBase.tags.filter(t => !selected.tags.includes(t)).map(t => (
                      <span key={`rm-${t}`} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 line-through">#{t}</span>
                    ))}
                    {selected.tags.filter(t => !diffBase.tags.includes(t)).map(t => (
                      <span key={`add-${t}`} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">#{t}</span>
                    ))}
                    {selected.tags.filter(t => diffBase.tags.includes(t)).map(t => (
                      <span key={`keep-${t}`} className="text-xs px-2 py-0.5 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)]">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Body diff */}
              <div>
                <span className="text-xs text-[var(--gh-text-muted)]">Body {previousVersion ? 'changes' : '(initial)'}</span>
                <div className="mt-1 p-3 rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] max-h-[400px] overflow-auto font-mono text-xs leading-relaxed">
                  {diffLines.length === 0 && <div className="text-[var(--gh-text-muted)]">No body changes</div>}
                  {diffLines.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === 'add'
                          ? 'bg-green-500/10 text-green-300'
                          : line.type === 'remove'
                          ? 'bg-red-500/10 text-red-300 line-through'
                          : 'text-[var(--gh-text-dim)]'
                      }
                    >
                      <span className="inline-block w-5 text-right mr-2 text-[var(--gh-text-muted)] select-none">
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                      </span>
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Full body (collapsed) */}
              <details className="mt-4">
                <summary className="text-xs text-[var(--gh-text-muted)] cursor-pointer hover:text-[var(--gh-cyan)]">Show full body</summary>
                <pre className="mt-2 p-3 rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] whitespace-pre-wrap text-sm max-h-[400px] overflow-auto">
                  {selected.body}
                </pre>
              </details>
            </>
          ) : (
            <div className="text-center py-12 text-[var(--gh-text-muted)]">Select a version to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
