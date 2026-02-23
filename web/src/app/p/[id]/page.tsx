"use client"
import { useMemo, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'
import { encodeShareCode } from '@/lib/share-code'
import { useParams, useRouter } from 'next/navigation'
import { copyToClipboard } from '@/lib/utils'
import { usePrompt } from '@/lib/hooks/usePrompt'

const visibilityStyle: Record<string, string> = {
  public: 'border-green-500/30 text-green-400 bg-green-500/5',
  unlisted: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5',
  private: 'border-[var(--gh-border)] text-[var(--gh-text-muted)] bg-[var(--gh-bg-soft)]',
}

export default function PromptPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const {
    data, notFound, liked, isAdmin, isSignedIn,
    collections, placeholders,
    toggleLike, forkPrompt, deletePrompt, incrementCopies, addToCollection,
  } = usePrompt(params.id)

  const [addStatus, setAddStatus] = useState<string>('')
  const [vars, setVars] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<'prompt' | 'json' | 'code' | 'embed' | 'url' | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [shareHint, setShareHint] = useState<'shared' | 'copied' | null>(null)
  const [bodyCopied, setBodyCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, vars])

  if (notFound) {
    return (
      <div className="mx-auto max-w-[900px] py-16 text-center">
        <h2 className="font-display text-xl mb-2">Prompt not found</h2>
        <p className="text-sm text-[var(--gh-text-muted)] mb-6">This prompt doesn&apos;t exist or is private.</p>
        <Link href="/" className="text-sm text-[var(--gh-cyan)] hover:underline underline-offset-2">Back to home</Link>
      </div>
    )
  }

  if (!data) {
    return <PromptSkeleton />
  }

  const uid = getFirebaseAuth()?.currentUser?.uid
  const isOwner = Boolean(uid && data.ownerId === uid)
  const canDelete = Boolean(uid && (data.ownerId === uid || isAdmin))
  const resolvedBody = applyVars(data.body)

  async function handleCopy(type: 'prompt' | 'json' | 'code' | 'url' | 'embed') {
    let text = ''
    switch (type) {
      case 'prompt':
        text = resolvedBody
        await incrementCopies()
        break
      case 'json':
        text = JSON.stringify({
          title: data!.title,
          body: resolvedBody,
          tags: data!.tags || [],
          sourceUrl: data!.sourceUrl || null,
          visibility: data!.visibility || 'public',
        })
        break
      case 'code':
        text = shareCode
        break
      case 'url':
        text = typeof window !== 'undefined' ? window.location.href : `/p/${params.id}`
        break
      case 'embed': {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        text = `<iframe src="${origin}/embed/p/${params.id}" width="600" height="200" frameborder="0" style="max-width:100%;"></iframe>`
        break
      }
    }
    await copyToClipboard(text)
    setCopied(type)
    setCopyOpen(false)
    setTimeout(() => setCopied(null), 1500)
  }

  async function handleShare() {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : `/p/${params.id}`
      if (navigator.share) {
        await navigator.share({ title: data!.title || 'GlyphHub Prompt', text: 'Check out this prompt on GlyphHub', url })
        setShareHint('shared')
      } else {
        await copyToClipboard(url)
        setShareHint('copied')
      }
    } catch {
      try {
        const url = typeof window !== 'undefined' ? window.location.href : `/p/${params.id}`
        await copyToClipboard(url)
        setShareHint('copied')
      } catch (e) {
        console.warn('[prompt] Failed to share', e)
      }
    } finally {
      setTimeout(() => setShareHint(null), 1500)
    }
  }

  return (
    <div className="mx-auto max-w-[900px] py-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl mb-3">{data.title}</h1>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-[11px] px-2.5 py-1 rounded-full border ${visibilityStyle[data.visibility] || visibilityStyle.public}`}>
            {data.visibility}
          </span>
          {data.forkOf && (
            <Link
              href={`/p/${data.forkOf}`}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--gh-border)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] transition-colors"
            >
              Forked from {data.forkOf}
            </Link>
          )}
          {data.sourceUrl && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--gh-border)] text-[var(--gh-cyan)] hover:bg-[var(--gh-surface)] transition-colors"
            >
              Source
            </a>
          )}
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-[var(--gh-border)]">
        {/* Copy dropdown */}
        <div className="relative">
          <button
            onClick={() => setCopyOpen(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text)] hover:border-[var(--gh-cyan)]/50 transition-colors"
            aria-haspopup="menu"
            aria-expanded={copyOpen}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {copyOpen && (
            <div
              className="absolute left-0 mt-1 w-48 rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] shadow-[var(--gh-shadow-2)] py-1 z-50"
              onMouseLeave={() => setCopyOpen(false)}
              role="menu"
            >
              {[
                { key: 'prompt' as const, label: 'Copy Prompt' },
                { key: 'json' as const, label: 'Copy JSON' },
                { key: 'code' as const, label: 'Copy Share Code' },
                { key: 'url' as const, label: 'Copy URL' },
                { key: 'embed' as const, label: 'Copy Embed' },
              ].map(item => (
                <button
                  key={item.key}
                  className="block w-full text-left px-3 py-2 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] hover:bg-[var(--gh-bg-soft)] transition-colors"
                  onClick={() => handleCopy(item.key)}
                  role="menuitem"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] hover:border-[var(--gh-cyan)]/50 transition-colors"
          onClick={handleShare}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {shareHint === 'shared' ? 'Shared!' : shareHint === 'copied' ? 'Link Copied!' : 'Share'}
        </button>

        {/* Like */}
        {isSignedIn && (
          <button
            onClick={toggleLike}
            className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border transition-colors ${
              liked
                ? 'border-[var(--gh-cyan)]/30 bg-[var(--gh-cyan)]/5 text-[var(--gh-cyan)]'
                : 'border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:border-[var(--gh-cyan)]/50'
            }`}
          >
            {liked ? '★' : '☆'}
            {liked ? 'Liked' : 'Like'}
          </button>
        )}

        {/* Fork */}
        {isSignedIn && (
          <button
            onClick={async () => {
              const newId = await forkPrompt()
              if (newId) router.push(`/p/${newId}`)
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:border-[var(--gh-cyan)]/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
              <path d="M12 12v3" />
            </svg>
            Fork
          </button>
        )}

        <div className="flex-1" />

        {/* Owner actions */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              href={`/p/${params.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] hover:border-[var(--gh-cyan)]/50 transition-colors"
            >
              Edit
            </Link>
            <Link
              href={`/p/${params.id}/versions`}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)] hover:border-[var(--gh-cyan)]/50 transition-colors"
            >
              Versions
            </Link>
          </div>
        )}

        {/* Chat */}
        <Link
          href={`/chat?pid=${params.id}&mode=system`}
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black font-medium hover:brightness-110 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </Link>
      </div>

      {/* ── Tags ── */}
      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.tags.map((t: string) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* ── Add to collection ── */}
      {isSignedIn && collections.length > 0 && (
        <div className="mb-5 flex items-center gap-2 text-sm">
          <span className="text-[var(--gh-text-muted)]">Collection:</span>
          <select
            className="rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-2.5 py-1.5 text-sm"
            onChange={async (e) => {
              const colId = e.target.value
              if (!colId) return
              try {
                setAddStatus('Adding...')
                await addToCollection(colId)
                setAddStatus('Added!')
                setTimeout(() => setAddStatus(''), 1500)
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed'
                setAddStatus(msg)
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Add to collection...</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {addStatus && (
            <span className="text-xs text-[var(--gh-text-muted)]">{addStatus}</span>
          )}
        </div>
      )}

      {/* ── Variable Inputs ── */}
      {placeholders.length > 0 && (
        <div className="mb-6 rounded-[14px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4">
          <div className="text-xs font-medium text-[var(--gh-text-muted)] mb-3 uppercase tracking-wider">
            Variables
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {placeholders.map(k => (
              <div key={k}>
                <label className="block text-xs mb-1 text-[var(--gh-text-dim)]">{k}</label>
                <input
                  value={vars[k] || ''}
                  onChange={e => setVars({ ...vars, [k]: e.target.value })}
                  className="w-full rounded-[10px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] px-3 py-2 text-sm focus:border-[var(--gh-cyan)]/50 focus:outline-none transition-colors"
                  placeholder={`Enter ${k}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Prompt Body ── */}
      <div className="relative group">
        <button
          type="button"
          onClick={async () => {
            await copyToClipboard(resolvedBody)
            await incrementCopies()
            setBodyCopied(true)
            setTimeout(() => setBodyCopied(false), 1500)
          }}
          className="absolute top-3 right-3 rounded-[8px] px-2.5 py-1.5 text-[11px] border border-[var(--gh-border)] bg-[var(--gh-surface)] text-[var(--gh-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--gh-cyan)] hover:border-[var(--gh-cyan)]/50 transition-all z-10"
          title="Copy prompt body"
        >
          {bodyCopied ? 'Copied!' : 'Copy'}
        </button>
        <pre className="p-5 rounded-[14px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] whitespace-pre-wrap text-sm leading-relaxed overflow-auto max-h-[600px]">
          {resolvedBody}
        </pre>
      </div>

      {/* ── Danger zone ── */}
      {canDelete && (
        <div className="mt-8 pt-6 border-t border-[var(--gh-border)]">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-[var(--gh-text-muted)] hover:text-red-400 transition-colors"
              type="button"
            >
              Delete this prompt
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-400">Are you sure? This cannot be undone.</span>
              <button
                onClick={async () => {
                  const ok = await deletePrompt()
                  if (ok) router.push('/')
                }}
                className="rounded-[8px] px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                type="button"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-[var(--gh-text-muted)] hover:text-[var(--gh-text)] transition-colors"
                type="button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PromptSkeleton() {
  return (
    <div className="mx-auto max-w-[900px] py-8 animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-2/3 rounded bg-[var(--gh-surface)] mb-3" />
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-16 rounded-full bg-[var(--gh-surface)]" />
          <div className="h-6 w-24 rounded-full bg-[var(--gh-surface)]" />
        </div>
      </div>
      <div className="flex gap-2 mb-6 pb-6 border-b border-[var(--gh-border)]">
        <div className="h-9 w-20 rounded-[10px] bg-[var(--gh-surface)]" />
        <div className="h-9 w-20 rounded-[10px] bg-[var(--gh-surface)]" />
        <div className="h-9 w-16 rounded-[10px] bg-[var(--gh-surface)]" />
      </div>
      <div className="flex gap-2 mb-5">
        <div className="h-6 w-14 rounded-full bg-[var(--gh-surface)]" />
        <div className="h-6 w-18 rounded-full bg-[var(--gh-surface)]" />
        <div className="h-6 w-12 rounded-full bg-[var(--gh-surface)]" />
      </div>
      <div className="rounded-[14px] bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] p-5 space-y-3">
        <div className="h-4 w-full rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-full rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-full rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-full rounded bg-[var(--gh-surface)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--gh-surface)]" />
      </div>
    </div>
  )
}
