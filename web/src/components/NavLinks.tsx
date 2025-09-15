"use client"
import { getFirebaseAuth } from '@/lib/firebase'

export function NavLinks() {
  const user = getFirebaseAuth()?.currentUser
  return (
    <div className="ml-auto flex items-center gap-2">
      {user && (
        <>
          <a href="/collections" className="text-sm text-[var(--gh-cyan)]">Collections</a>
          <span className="text-[var(--gh-text-muted)]">·</span>
        </>
      )}
      <a href="/trending" className="text-sm text-[var(--gh-cyan)]">Trending</a>
      <span className="text-[var(--gh-text-muted)]">·</span>
      <a href="/import" className="text-sm text-[var(--gh-cyan)]">Import</a>
      <span className="text-[var(--gh-text-muted)]">·</span>
      <a href="/help" className="text-sm text-[var(--gh-cyan)]">Help</a>
    </div>
  )
}


