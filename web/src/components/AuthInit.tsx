"use client"
import { useEffect } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { browserLocalPersistence, setPersistence } from 'firebase/auth'
import { ThemeClient } from './ThemeClient'

export function AuthInit() {
  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      console.warn('[auth] AuthInit: no auth instance available')
    } else {
      setPersistence(auth, browserLocalPersistence).catch((e) => {
        console.debug('[auth] setPersistence failed (ok in some browsers)', e)
      })
    }
    // No redirect completion needed without Google login
  }, [])
  return <ThemeClient />
}


