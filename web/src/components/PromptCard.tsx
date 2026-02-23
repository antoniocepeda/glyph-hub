"use client"
import Link from 'next/link'
import { relativeTime } from '@/lib/utils'
import type { Visibility, PromptStats } from '@/lib/types'

export type PromptCardProps = {
  id: string
  title: string
  body?: string
  tags?: string[]
  visibility?: Visibility
  stats?: PromptStats
  createdAt?: Date
  updatedAt?: Date
  forkOf?: string
  showVisibilityBadge?: boolean
  showStats?: boolean
  showActions?: boolean
  variant?: 'compact' | 'full' | 'featured'
  rank?: number
}

const visibilityStyle: Record<Visibility, string> = {
  public: 'border-green-500/30 text-green-400',
  unlisted: 'border-yellow-500/30 text-yellow-400',
  private: 'border-[var(--gh-border)] text-[var(--gh-text-muted)]',
}

const rankMedals: Record<number, string> = {
  1: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  2: 'bg-gray-400/10 text-gray-300 border-gray-400/30',
  3: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

export function PromptCard({
  id,
  title,
  body,
  tags = [],
  visibility = 'public',
  stats,
  updatedAt,
  forkOf,
  showVisibilityBadge = false,
  showStats = false,
  showActions = false,
  variant = 'compact',
  rank,
}: PromptCardProps) {
  if (variant === 'featured') {
    return <FeaturedCard id={id} title={title} body={body} tags={tags} stats={stats} rank={rank} />
  }

  const maxTags = 3

  return (
    <div className="group relative rounded-[14px] bg-[var(--gh-surface)] border border-[var(--gh-border)] p-4 flex flex-col transition-all hover:shadow-[var(--gh-shadow-2)] hover:border-[var(--gh-border)]/80">
      {/* Rank badge */}
      {rank != null && rank <= 3 && (
        <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full border text-xs font-bold flex items-center justify-center ${rankMedals[rank] || ''}`}>
          {rank}
        </div>
      )}
      {rank != null && rank > 3 && (
        <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full border border-[var(--gh-border)] bg-[var(--gh-bg-soft)] text-[10px] font-medium text-[var(--gh-text-muted)] flex items-center justify-center">
          {rank}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/p/${id}`}
          className="font-medium hover:text-[var(--gh-cyan)] line-clamp-1 flex-1 transition-colors"
        >
          {title}
        </Link>
        {showVisibilityBadge && (
          <span
            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${visibilityStyle[visibility]}`}
          >
            {visibility}
          </span>
        )}
      </div>

      {/* Body preview */}
      {body && (
        <p className="text-[var(--gh-text-dim)] text-sm line-clamp-2 mb-3 flex-1">
          {body}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, maxTags).map(t => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gh-bg-soft)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]"
            >
              #{t}
            </span>
          ))}
          {tags.length > maxTags && (
            <span className="text-[10px] text-[var(--gh-text-muted)]">
              +{tags.length - maxTags}
            </span>
          )}
        </div>
      )}

      {/* Footer: stats + actions */}
      {(showStats || showActions) && (
        <div className="flex items-center justify-between text-xs text-[var(--gh-text-muted)] mt-auto pt-2 border-t border-[var(--gh-border)]">
          {showStats && stats && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {stats.views ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {stats.likes ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {stats.copies ?? 0}
              </span>
            </div>
          )}
          {showStats && !stats && (
            <div className="flex gap-3">
              <span>0 views</span>
              <span>0 likes</span>
              <span>0 copies</span>
            </div>
          )}
          {showActions && (
            <div className="flex gap-2">
              <Link href={`/p/${id}/edit`} className="hover:text-[var(--gh-cyan)] transition-colors">
                Edit
              </Link>
              <Link href={`/p/${id}/versions`} className="hover:text-[var(--gh-cyan)] transition-colors">
                History
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Meta: fork + updated */}
      {(forkOf || updatedAt) && variant === 'full' && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--gh-text-muted)]">
          {forkOf && (
            <span>
              Forked from{' '}
              <Link href={`/p/${forkOf}`} className="text-[var(--gh-cyan)]">
                {forkOf}
              </Link>
            </span>
          )}
          {updatedAt && <span>Updated {relativeTime(updatedAt)}</span>}
        </div>
      )}
    </div>
  )
}

function FeaturedCard({
  id,
  title,
  body,
  tags = [],
  stats,
  rank,
}: {
  id: string
  title: string
  body?: string
  tags?: string[]
  stats?: PromptStats
  rank?: number
}) {
  return (
    <Link
      href={`/p/${id}`}
      className="group relative block rounded-[16px] bg-gradient-to-br from-[var(--gh-surface)] to-[var(--gh-bg-soft)] border border-[var(--gh-border)] p-6 transition-all hover:shadow-[var(--gh-shadow-2)] hover:border-[var(--gh-cyan)]/20"
    >
      {rank != null && (
        <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full border text-sm font-bold flex items-center justify-center ${rank <= 3 ? (rankMedals[rank] || '') : 'border-[var(--gh-border)] bg-[var(--gh-bg-soft)] text-[var(--gh-text-muted)]'}`}>
          {rank}
        </div>
      )}
      <h3 className="font-display text-xl mb-2 group-hover:text-[var(--gh-cyan)] transition-colors">{title}</h3>
      {body && (
        <p className="text-[var(--gh-text-dim)] text-sm line-clamp-3 mb-4">{body}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.slice(0, 4).map(t => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--gh-bg)]/50 border border-[var(--gh-border)] text-[var(--gh-text-muted)]"
            >
              #{t}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[11px] text-[var(--gh-text-muted)]">+{tags.length - 4}</span>
          )}
        </div>
      )}
      {stats && (
        <div className="flex items-center gap-4 text-xs text-[var(--gh-text-muted)]">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {stats.views ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {stats.likes ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            {stats.copies ?? 0}
          </span>
        </div>
      )}
    </Link>
  )
}

export function PromptCardSkeleton() {
  return (
    <div className="rounded-[14px] p-4 bg-[var(--gh-surface)] border border-[var(--gh-border)] animate-pulse flex flex-col gap-3">
      <div className="h-4 w-3/4 rounded bg-[var(--gh-bg-soft)]" />
      <div className="h-3 w-full rounded bg-[var(--gh-bg-soft)]" />
      <div className="h-3 w-2/3 rounded bg-[var(--gh-bg-soft)]" />
      <div className="flex gap-2 mt-1">
        <div className="h-4 w-12 rounded-full bg-[var(--gh-bg-soft)]" />
        <div className="h-4 w-14 rounded-full bg-[var(--gh-bg-soft)]" />
      </div>
    </div>
  )
}

export function PromptCardListItem({
  id,
  title,
  visibility = 'public',
  stats,
  updatedAt,
  showVisibilityBadge = false,
}: PromptCardProps) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-[10px] bg-[var(--gh-surface)] border border-[var(--gh-border)] hover:shadow-[var(--gh-shadow-2)] transition-shadow">
      <Link
        href={`/p/${id}`}
        className="font-medium hover:text-[var(--gh-cyan)] truncate flex-1 transition-colors"
      >
        {title}
      </Link>
      {showVisibilityBadge && (
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${visibilityStyle[visibility!]}`}
        >
          {visibility}
        </span>
      )}
      <div className="hidden sm:flex gap-3 text-xs text-[var(--gh-text-muted)]">
        <span>{stats?.views ?? 0} views</span>
        <span>{stats?.likes ?? 0} likes</span>
        <span>{stats?.copies ?? 0} copies</span>
      </div>
      {updatedAt && (
        <span className="hidden md:inline text-[10px] text-[var(--gh-text-muted)]">
          {relativeTime(updatedAt)}
        </span>
      )}
      <div className="flex gap-2 text-xs text-[var(--gh-text-muted)]">
        <Link href={`/p/${id}/edit`} className="hover:text-[var(--gh-cyan)] transition-colors">
          Edit
        </Link>
        <Link href={`/p/${id}/versions`} className="hover:text-[var(--gh-cyan)] transition-colors">
          History
        </Link>
      </div>
    </div>
  )
}
