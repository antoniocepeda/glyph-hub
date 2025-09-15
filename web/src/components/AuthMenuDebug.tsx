"use client"
import { useEffect, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { onIdTokenChanged } from 'firebase/auth'

export function AuthMenuDebug() {
  const [info, setInfo] = useState<string>('init')
  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) { setInfo('no auth'); return }
    setInfo(auth.currentUser ? `user:${auth.currentUser.uid}` : 'no user')
    const unsub = onIdTokenChanged(auth, (u) => setInfo(u ? `user:${u.uid}` : 'no user'))
    return () => unsub()
  }, [])
  return <span className="text-xs text-[var(--gh-text-muted)]">{info}</span>
}


