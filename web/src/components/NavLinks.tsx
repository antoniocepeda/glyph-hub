"use client"
import { getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'

export function NavLinks() {
  const user = getFirebaseAuth()?.currentUser
  return (
    <div className="flex items-center gap-2">
      {user && (
        <Link
          href="/collections"
          className="inline-flex items-center px-2 py-3 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
        >
          Collections
        </Link>
      )}
      {/* Import and Help moved/removed */}
    </div>
  )
}

