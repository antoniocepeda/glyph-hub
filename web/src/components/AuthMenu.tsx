"use client"
import { useEffect, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { onIdTokenChanged, User } from 'firebase/auth'
import { signOut } from '@/lib/auth'

export function AuthMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      console.warn('[auth] No Firebase auth instance; check env config')
      return
    }
    // Set immediately from currentUser (after refresh) then subscribe
    setUser(auth.currentUser)
    const unsub = onIdTokenChanged(auth, (u) => {
      setUser(u)
    })
    return () => unsub()
  }, [])

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a href="/login" className="text-sm text-[var(--gh-cyan)]">Sign in</a>
      </div>
    )
  }

  const label = user.displayName || user.email || 'Account'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
      >
        {label}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] shadow-[var(--gh-shadow-2)] py-1"
          role="menu"
          onMouseLeave={() => setOpen(false)}
        >
          <a
            href={`/profile/${user.uid}`}
            className="block px-3 py-2 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
            role="menuitem"
            onClick={() => setOpen(false)}
          >Profile</a>
          <button
            onClick={() => { setOpen(false); signOut() }}
            className="block w-full text-left px-3 py-2 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
            role="menuitem"
          >Sign out</button>
        </div>
      )}
    </div>
  )
}


