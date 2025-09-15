"use client"
import { useEffect, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { onIdTokenChanged, User } from 'firebase/auth'
import { signOut } from '@/lib/auth'

export function AuthMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="flex items-center gap-2">
      <a href={`/profile/${user.uid}`} className="text-sm text-[var(--gh-cyan)]">{user.email || 'User'}</a>
      <button onClick={() => signOut()} className="text-sm text-[var(--gh-cyan)]">Sign out</button>
    </div>
  )
}


