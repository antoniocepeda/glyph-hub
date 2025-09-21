export const dynamic = 'force-dynamic'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const ChatClient = dynamic(() => import('../_chat_disabled/page'), { ssr: false })

export default function ChatPage() {
  return (
    <Suspense fallback={<div />}> 
      <ChatClient />
    </Suspense>
  )
}

"use client"
export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDb, getFirebaseAuth } from '@/lib/firebase'
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'

type Role = 'system'|'user'|'assistant'
type Message = { role: Role; content: string }

// Use widely available, known-good slugs on Replicate
const DEFAULT_MODEL = 'meta/meta-llama-3-8b-instruct'

function extractPlaceholders(text: string): string[] {
  const set = new Set<string>()
  for (const m of text.matchAll(/\{\{([^}]+)\}\}/g)) set.add(m[1].trim())
  return Array.from(set)
}

export default function ChatPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const pid = sp.get('pid') || ''
  const mode = (sp.get('mode') || 'system') as 'system'|'user'
  const cid = sp.get('cid') || ''

  const [model, setModel] = useState<string>(DEFAULT_MODEL)
  const [customModel, setCustomModel] = useState<string>('')
  const [modelValid, setModelValid] = useState<null|boolean>(null)
  const [modelHint, setModelHint] = useState<string>('')
  const [temperature, setTemperature] = useState<number>(0.7)
  const [maxTokens, setMaxTokens] = useState<number>(512)
  const [system, setSystem] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [err, setErr] = useState<string>('')
  const [chatId, setChatId] = useState<string>('')
  const [seedPrompt, setSeedPrompt] = useState<{ title: string; body: string }|null>(null)
  const [vars, setVars] = useState<Record<string, string>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const tokensRef = useRef<string[]>([])
  const [readable, setReadable] = useState<boolean>(false)
  const [showBrowse, setShowBrowse] = useState<boolean>(false)
  const [curated, setCurated] = useState<{ slug: string; displayName?: string; description?: string }[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [modelFilter, setModelFilter] = useState<string>('')
  const [streamingCap, setStreamingCap] = useState<'unknown'|'stream'|'nonstream'>('unknown')

  function getSelectedSlug(): string {
    return model === '__custom__' ? customModel.trim() : model
  }
  function loadStreamCaps(): Record<string, 'stream'|'nonstream'> {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('gh_stream_caps') || '{}') || {} } catch { return {} }
  }
  function saveStreamCaps(map: Record<string, 'stream'|'nonstream'>) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('gh_stream_caps', JSON.stringify(map)) } catch {}
  }

  function normalizeSpacingHeuristic(text: string): string {
    let out = text
    // Add a space after punctuation if followed immediately by non-space
    out = out.replace(/([,:;!?])(\S)/g, '$1 $2')
    // Add a space between letter and digit boundaries
    out = out.replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2')
    // Add a space between lower->Upper camel break (heuristic)
    out = out.replace(/([a-z])([A-Z])/g, '$1 $2')
    return out
  }

  function joinTokensReadable(tokens: string[]): string {
    let out = ''
    const isWs = (c: string) => /\s/.test(c)
    const isAlpha = (c: string) => /[A-Za-z]/.test(c)
    const isDigit = (c: string) => /\d/.test(c)
    const needsSpaceAfter = (c: string) => /[\.:,;!?)]/.test(c)
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i] ?? ''
      if (!tok) continue
      if (out.length === 0) { out += tok; continue }
      const last = out.charAt(out.length - 1)
      const first = tok.charAt(0)
      const prevTok = tokens[i - 1] ?? ''
      const prevLen = prevTok.length

      if (!isWs(last) && !isWs(first)) {
        // Do not split a mid-word boundary like "h" + "ush"
        const prevIsSingleLetter = prevLen === 1 && isAlpha(prevTok)
        const nextStartsLower = /^[a-z]/.test(first)
        const prevIsSinglePronoun = prevLen === 1 && /^(I|A|a)$/.test(prevTok)

        if (needsSpaceAfter(last) && (isAlpha(first) || isDigit(first))) {
          out += ' '
        } else if ((isAlpha(last) && isDigit(first)) || (isDigit(last) && isAlpha(first))) {
          out += ' '
        } else if (prevIsSinglePronoun && isAlpha(first)) {
          // "I" / "a" followed by a word
          out += ' '
        } else if (isAlpha(last) && isAlpha(first)) {
          // Default alpha-alpha spacing, except when previous token is a single letter
          if (!prevIsSingleLetter || !nextStartsLower) {
            out += ' '
          }
        }
      }
      out += tok
    }
    return out
  }

  // Load prompt if pid provided
  useEffect(() => {
    if (!pid) return
    const db = getDb()
    if (!db) return
    getDoc(doc(db, 'prompts', pid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as { title?: string; body?: string }
        setSeedPrompt({ title: d.title || 'Prompt', body: d.body || '' })
        // Default system/user seeding
        if (mode === 'system') setSystem(d.body || '')
        if (mode === 'user') setInput(d.body || '')
      }
    }).catch(() => {})
  }, [pid, mode])

  // Load existing chat if cid provided
  useEffect(() => {
    async function loadChat() {
      if (!cid) return
      const db = getDb()
      if (!db) return
      try {
        const snap = await getDoc(doc(db, 'chats', cid))
        if (snap.exists()) {
          const d = snap.data() as any
          setChatId(snap.id)
          if (typeof d.model === 'string') {
            const known = new Set([
              'meta/meta-llama-3-8b-instruct',
              'meta/meta-llama-3-70b-instruct',
              'mistralai/mixtral-8x7b-instruct',
            ])
            if (known.has(d.model)) {
              setModel(d.model)
            } else {
              setModel('__custom__')
              setCustomModel(d.model)
            }
          } else {
            setModel(DEFAULT_MODEL)
          }
          setSystem(d.system || '')
          if (Array.isArray(d.messages)) {
            setMessages(d.messages as Message[])
          }
        }
      } catch {}
    }
    loadChat()
  }, [cid])

  // Load curated models from /api/models; load favorites and recents from Firestore
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch('/api/models')
        if (res.ok) {
          const j = await res.json()
          const items = Array.isArray(j.curated) ? j.curated : []
          setCurated(items.map((m: any) => ({ slug: m.slug || `${m.owner}/${m.name}`, displayName: m.displayName || undefined, description: m.description || undefined })))
        }
      } catch {}
      try {
        const db = getDb()
        const uid = getFirebaseAuth()?.currentUser?.uid
        if (db && uid) {
          // Favorites
          const favSnaps = await getDocs(collection(db, 'users', uid, 'models', 'favorites', 'items'))
          setFavorites(favSnaps.docs.map(d => (d.data() as any).slug).filter(Boolean))
          // Recent models from chats
          const chatSnaps = await getDocs(query(collection(db, 'chats'), where('ownerId', '==', uid), orderBy('updatedAt', 'desc'), limit(20)))
          const seen = new Set<string>()
          for (const d of chatSnaps.docs) {
            const m = (d.data() as any).model
            if (typeof m === 'string') seen.add(m)
            if (seen.size >= 10) break
          }
          setRecent(Array.from(seen))
        }
      } catch {}
    }
    loadModels()
  }, [])

  // Validate selected/custom model slug
  useEffect(() => {
    const controller = new AbortController()
    // Load known capability
    try {
      const caps = JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('gh_stream_caps') || '{}') : '{}') || {}
      const s = model === '__custom__' ? customModel.trim() : model
      setStreamingCap(s && caps[s] ? caps[s] : 'unknown')
    } catch {}
    const slug = model === '__custom__' ? customModel.trim() : model
    if (!slug) { setModelValid(null); setModelHint(''); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/models/validate?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
        const j = await res.json().catch(() => ({}))
        if (j && typeof j.ok === 'boolean') {
          setModelValid(Boolean(j.ok))
          setModelHint(j.ok ? '' : (j.message || 'Model not found'))
        } else {
          setModelValid(null)
          setModelHint('')
        }
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          setModelValid(null)
          setModelHint('')
        }
      }
    })()
    return () => controller.abort()
  }, [model, customModel])

  const placeholders = useMemo(() => extractPlaceholders(seedPrompt?.body || ''), [seedPrompt])
  const appliedSeed = useMemo(() => {
    if (!seedPrompt) return ''
    return (seedPrompt.body || '').replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] ?? `{{${k}}}`)
  }, [seedPrompt, vars])

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function ensureChatId(): Promise<string> {
    const modelToUse = model === '__custom__' ? (customModel.trim() || DEFAULT_MODEL) : model
    if (chatId) return chatId
    const db = getDb()
    const auth = getFirebaseAuth()
    const user = auth?.currentUser
    if (!db || !user) return ''
    const ref = doc(collection(db, 'chats'))
    const meta = {
      ownerId: user.uid,
      model: modelToUse,
      system,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      promptId: pid || null,
      title: seedPrompt?.title || 'Chat',
      messages: [] as Message[],
    }
    await setDoc(ref, meta)
    setChatId(ref.id)
    return ref.id
  }

  async function persist(messagesToSave: Message[]) {
    const modelToUse = model === '__custom__' ? (customModel.trim() || DEFAULT_MODEL) : model
    const id = await ensureChatId()
    const db = getDb()
    if (!db || !id) return
    await updateDoc(doc(db, 'chats', id), {
      messages: messagesToSave,
      model: modelToUse,
      system,
      updatedAt: serverTimestamp(),
    })
  }

  async function send() {
    setErr('')
    const userText = input.trim()
    const sys = system.trim()
    if (!userText && messages.length === 0 && !sys) return
    const auth = getFirebaseAuth()
    const user = auth?.currentUser
    if (!user) {
      setErr('Sign in to chat and save transcripts.')
      return
    }
    // Apply seed variable substitutions
    let effectiveSystem = sys
    if (seedPrompt && mode === 'system') effectiveSystem = appliedSeed
    let effectiveUser = userText
    if (seedPrompt && mode === 'user' && messages.length === 0 && !input.trim()) effectiveUser = appliedSeed

    const base: Message[] = []
    if (effectiveSystem) base.push({ role: 'system', content: effectiveSystem })
    const history = messages.filter(m => m.role !== 'system')
    const nextMessages = [...base, ...history, { role: 'user', content: effectiveUser || userText }]

    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const DEBUG = process.env.NODE_ENV !== 'production'
      const modelToUse = model === '__custom__' ? customModel.trim() : model
      if (!modelToUse) {
        setErr('Enter a model slug (e.g., owner/name)')
        setLoading(false)
        return
      }
      if (DEBUG) {
        console.log('[chat] POST /api/chat', {
          model: modelToUse,
          temperature,
          maxTokens,
          system: effectiveSystem?.slice(0, 80) || '',
          user: (effectiveUser || userText).slice(0, 80),
          historyCount: nextMessages.length,
        })
      }
      await persist(nextMessages)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages: nextMessages.filter(m => m.role !== 'system'),
          system: effectiveSystem,
          temperature,
          maxTokens,
        }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Request failed')
        throw new Error(text)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistant = ''
      tokensRef.current = []
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          const s = decoder.decode(value, { stream: true })
          // Parse simple SSE: event: <type>\n data: <payload>\n\n
          for (const block of s.split('\n\n')) {
            if (!block.trim()) continue
            const lines = block.split('\n')
            const ev = lines.find(l => l.startsWith('event:'))?.slice(6).trim() || ''
            const dat = (() => {
              const payload: string[] = []
              for (const line of lines) {
                if (line.startsWith('data:')) {
                  // Strip only the prefix and a single optional space to preserve payload spacing
                  let s = line.slice(5)
                  if (s.startsWith(' ')) s = s.slice(1)
                  payload.push(s)
                } else if (!/^\w+:/.test(line)) {
                  // Non-prefixed lines (seen in some previews/streams) — treat as continuation
                  payload.push(line)
                }
              }
              return payload.join('\n')
            })()
            if (DEBUG) {
              console.log('[chat][sse]', { ev, sample: dat.slice(0, 200) })
            }
            if (ev === 'debug') {
              console.log('[chat][api-debug]', dat)
              if (/fallback:non-stream/i.test(dat)) {
                const slug = getSelectedSlug(); if (slug) {
                  const m = loadStreamCaps(); if (m[slug] !== 'nonstream') { m[slug] = 'nonstream'; saveStreamCaps(m) }
                  setStreamingCap('nonstream')
                }
              }
              continue
            }
            if (ev === 'ready') {
              if (DEBUG) console.log('[chat] stream ready')
              continue
            }
            if (ev === 'token') {
              // Raw mode: append exactly what the server sent
              const text = (() => {
                try {
                  const j = JSON.parse(dat)
                  return typeof j === 'string' ? j : (j?.text || j?.output || dat)
                } catch {
                  return dat
                }
              })()
              if (text) {
                // Mark streaming capability true on first token
                try {
                  if (streamingCap !== 'stream') {
                    const slug = model === '__custom__' ? customModel.trim() : model
                    if (slug) {
                      const caps = JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('gh_stream_caps') || '{}') : '{}') || {}
                      if (caps[slug] !== 'stream') { caps[slug] = 'stream'; if (typeof window !== 'undefined') localStorage.setItem('gh_stream_caps', JSON.stringify(caps)) }
                      setStreamingCap('stream')
                    }
                  }
                } catch {}
                tokensRef.current.push(text)
                assistant += text
                setMessages(prev => {
                  const copy = [...prev]
                  // Store raw assistant; display is decided at render by the toggle
                  copy[copy.length - 1] = { role: 'assistant', content: assistant }
                  return copy
                })
              }
            } else if (ev === 'error') {
              setErr(dat || 'error')
            }
          }
        }
      }
      const finalMessages = [...nextMessages, { role: 'assistant', content: assistant }]
      await persist(finalMessages)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Suspense fallback={<div />}> 
    <div className="mx-auto max-w-[900px] py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Chat</h1>
        <div className="text-sm flex items-center gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={readable}
              onChange={e => setReadable(e.target.checked)}
            />
            <span className="text-[var(--gh-text-muted)]">Readable</span>
          </label>
          <Link href="/chats" className="text-[var(--gh-cyan)]">My Chats</Link>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Model{(() => {
            if (streamingCap === 'unknown') return null
            const text = streamingCap === 'stream' ? 'Streaming: Yes' : 'Streaming: No'
            return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full border" style={{borderColor:'var(--gh-border)'}}>{text}</span>
          })()}</label>
          <div className="flex flex-wrap items-center gap-2">
            <select value={model} onChange={e => setModel(e.target.value)} className="flex-1 rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-2 text-sm">
              {favorites.length > 0 && (
                <optgroup label="Favorites">
                  {favorites.map(slug => (
                    <option key={`fav-${slug}`} value={slug}>{slug}</option>
                  ))}
                </optgroup>
              )}
              {recent.length > 0 && (
                <optgroup label="Recent">
                  {recent.map(slug => (
                    <option key={`rec-${slug}`} value={slug}>{slug}</option>
                  ))}
                </optgroup>
              )}
              {curated.length > 0 && (
                <optgroup label="Curated">
                  {curated.map(m => (
                    <option key={`cur-${m.slug}`} value={m.slug}>{m.displayName || m.slug}</option>
                  ))}
                </optgroup>
              )}
              <option value="meta/meta-llama-3-8b-instruct">Llama 3 8B Instruct</option>
              <option value="meta/meta-llama-3-70b-instruct">Llama 3 70B Instruct</option>
              <option value="mistralai/mixtral-8x7b-instruct">Mixtral 8x7B Instruct</option>
              <option value="__custom__">Custom…</option>
            </select>
            <button type="button" className="text-sm text-[var(--gh-cyan)] whitespace-nowrap shrink-0" onClick={() => setShowBrowse(true)}>Browse</button>
            {(() => {
              const slug = model === '__custom__' ? customModel.trim() : model
              const isFav = slug && favorites.includes(slug)
              const uid = getFirebaseAuth()?.currentUser?.uid
              return (
                <button
                  type="button"
                  className={`relative z-10 shrink-0 text-sm ${isFav ? 'text-[var(--gh-cyan)]' : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]'}`}
                  title={uid ? (isFav ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite models'}
                  onClick={async () => {
                    try {
                      const db = getDb()
                      const user = getFirebaseAuth()?.currentUser
                      if (!db || !user || !slug) return
                      const favId = slug.replace(/\//g, '__')
                      const ref = doc(db, 'users', user.uid, 'models', 'favorites', 'items', favId)
                      if (!isFav) {
                        await setDoc(ref, { slug, addedAt: new Date() })
                        setFavorites(prev => Array.from(new Set([...prev, slug])))
                      } else {
                        await deleteDoc(ref)
                        setFavorites(prev => prev.filter(s => s !== slug))
                      }
                    } catch (e) {
                      setErr('Could not update favorites (permissions?)')
                      setTimeout(() => setErr(''), 3000)
                    }
                  }}
                  disabled={!uid || !slug}
                >
                  {isFav ? '★ Fav' : '☆ Fav'}
                </button>
              )
            })()}
          </div>
          <div className="mt-1 text-xs flex items-center gap-2">
            {(() => {
              const slug = model === '__custom__' ? customModel.trim() : model
              if (!slug) return null
              const url = `https://replicate.com/${slug}`
              return (
                <>
                  <a href={url} target="_blank" rel="noreferrer" className="underline text-[var(--gh-text-muted)]">Open on Replicate</a>
                  {modelValid === false && <span className="text-red-400">{modelHint || 'Model not found'}</span>}
                  {modelValid === true && <span className="text-[var(--gh-text-muted)]">✓ Valid</span>}
                </>
              )
            })()}
          </div>
          {model === '__custom__' && (
            <input
              className="mt-2 w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-2 text-sm"
              placeholder="owner/name (e.g., meta/meta-llama-3-8b-instruct)"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
            />
          )}
        </div>
        <div>
          <label
            className="block text-xs mb-1 text-[var(--gh-text-muted)]"
            title="Controls randomness. Lower = more focused and deterministic; higher = more creative and varied. Try 0.2–0.4 for precise tasks, 0.6–0.9 for brainstorming."
          >
            Temperature: {temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={temperature}
            onChange={e => setTemperature(Number(e.target.value))}
            className="w-full"
            title="Lower = more focused; higher = more creative"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">Max tokens</label>
          <input type="number" min={64} max={4096} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value) || 512)} className="w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-2 text-sm" />
        </div>
      </div>

      {showBrowse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-[min(800px,95vw)] max-h-[80vh] overflow-auto rounded-[12px] bg-[var(--gh-bg)] border border-[var(--gh-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display">Browse Models</div>
              <button className="text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]" onClick={() => setShowBrowse(false)}>Close</button>
            </div>
            <input
              className="w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-2 text-sm"
              placeholder="Search curated models…"
              value={modelFilter}
              onChange={e => setModelFilter(e.target.value)}
            />
            <div className="mt-3 grid gap-2">
              {curated
                .filter(m => {
                  const q = modelFilter.trim().toLowerCase()
                  if (!q) return true
                  return m.slug.toLowerCase().includes(q) || (m.displayName || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
                })
                .map(m => (
                <div key={m.slug} className="flex items-start justify-between gap-3 rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] p-3">
                  <div>
                    <div className="text-sm font-medium">{m.displayName || m.slug}</div>
                    <div className="text-xs text-[var(--gh-text-muted)]">{m.slug}</div>
                    {m.description && <div className="text-xs mt-1 text-[var(--gh-text-dim)]">{m.description}</div>}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      className={`text-sm ${favorites.includes(m.slug) ? 'text-[var(--gh-cyan)]' : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]'}`}
                      onClick={async () => {
                        try {
                          const db = getDb()
                          const uid = getFirebaseAuth()?.currentUser?.uid
                          if (!db || !uid) return
                          const favId = m.slug.replace(/\//g, '__')
                          const ref = doc(db, 'users', uid, 'models', 'favorites', 'items', favId)
                          if (!favorites.includes(m.slug)) {
                            await setDoc(ref, { slug: m.slug, addedAt: new Date() })
                            setFavorites(prev => Array.from(new Set([...prev, m.slug])))
                          } else {
                            await deleteDoc(ref)
                            setFavorites(prev => prev.filter(s => s !== m.slug))
                          }
                        } catch {}
                      }}
                    >
                      {favorites.includes(m.slug) ? '★ Starred' : '☆ Star'}
                    </button>
                    <button
                      className="text-sm text-[var(--gh-cyan)]"
                      onClick={() => {
                        setModel(m.slug)
                        setShowBrowse(false)
                      }}
                    >Use</button>
                  </div>
                </div>
              ))}
              {curated.length === 0 && (
                <div className="text-sm text-[var(--gh-text-muted)]">No curated models available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">System (optional)</label>
        <textarea value={system} onChange={e => setSystem(e.target.value)} rows={3} className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm" placeholder="Instructions or pre-prompt" />
      </div>

      {seedPrompt && (
        <div className="mt-4 p-3 rounded-[12px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)]">
          <div className="text-sm mb-2">
            Using prompt “{seedPrompt.title}” ({mode === 'system' ? 'as system' : 'as first user message'})
          </div>
          {placeholders.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {placeholders.map(k => (
                <div key={k}>
                  <label className="block text-xs mb-1 text-[var(--gh-text-muted)]">{k}</label>
                  <input value={vars[k] || ''} onChange={e => setVars({ ...vars, [k]: e.target.value })} className="w-full rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2 py-2 text-sm" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-[var(--gh-text-muted)]">Preview</div>
          <pre className="mt-1 whitespace-pre-wrap text-sm p-2 rounded-[8px] bg-[var(--gh-surface)] border border-[var(--gh-border)]">{appliedSeed}</pre>
          <div className="mt-2 text-right">
            {mode === 'system' ? (
              <button onClick={() => setSystem(appliedSeed)} className="text-[var(--gh-cyan)]">Apply to System</button>
            ) : (
              <button onClick={() => setInput(appliedSeed)} className="text-[var(--gh-cyan)]">Use as Message</button>
            )}
          </div>
        </div>
      )}

      <div ref={listRef} className="mt-4 h-[380px] overflow-auto rounded-[12px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] p-3">
        {messages.length === 0 && (
          <div className="text-sm text-[var(--gh-text-muted)]">Start chatting by entering a message below.</div>
        )}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          let display = m.content
          if (m.role === 'assistant' && readable) {
            display = isLast && tokensRef.current.length > 0
              ? joinTokensReadable(tokensRef.current)
              : normalizeSpacingHeuristic(m.content)
          }
          return (
            <div key={i} className="mb-3">
              <div className="text-xs text-[var(--gh-text-muted)]">{m.role}</div>
              <div className="whitespace-pre-wrap text-sm">{display}</div>
            </div>
          )
        })}
        {err && (<div className="text-red-400 text-sm">{err}</div>)}
      </div>

      <div className="mt-3 flex gap-2 items-start">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!loading) send() } }}
          rows={3}
          className="flex-1 rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          placeholder="Type your message and press Enter"
        />
        <button
          className={`px-4 py-2 rounded-[10px] border ${loading ? 'opacity-60' : ''}`}
          disabled={loading}
          onClick={() => send()}
        >
          {loading ? 'Streaming…' : 'Send'}
        </button>
      </div>

      <div className="mt-2 text-xs text-[var(--gh-text-muted)]">
        Chats are saved to your account. Requires REPLICATE_API_TOKEN on the server.
      </div>
    </div>
    </Suspense>
  )
}
