"use client"
import { getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'

export function NavLinks() {
  const user = getFirebaseAuth()?.currentUser
  return (
    <div className="ml-auto flex items-center gap-2">
      {user && (
        <>
          <Link href="/collections" className="text-sm text-[var(--gh-cyan)]">Collections</Link>
          <span className="text-[var(--gh-text-muted)]">·</span>
        </>
      )}
      <Link href="/trending" className="text-sm text-[var(--gh-cyan)]">Trending</Link>
      <span className="text-[var(--gh-text-muted)]">·</span>
      <Link href="/import" className="text-sm text-[var(--gh-cyan)]">Import</Link>
      <span className="text-[var(--gh-text-muted)]">·</span>
      <Link href="/help" className="text-sm text-[var(--gh-cyan)]">Help</Link>
    </div>
  )
}


