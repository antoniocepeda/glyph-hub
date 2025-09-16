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
        </>
      )}
      {/* Import and Help moved/removed */}
    </div>
  )
}


