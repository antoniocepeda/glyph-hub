"use client"
import { useState, useEffect } from 'react'
import { registerWithEmailPassword, signInWithEmailPassword } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mode, setMode] = useState<'signin'|'create'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // If already signed in, route to profile immediately
  useEffect(() => {
    const uid = getFirebaseAuth()?.currentUser?.uid
    if (uid) router.replace(`/profile/${uid}`)
  }, [router])

  async function doSignIn() {
    setLoading(true)
    setError(null)
    try {
      const user = await signInWithEmailPassword(email, password)
      router.replace(`/profile/${user.uid}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to sign in'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function doRegister() {
    setLoading(true)
    setError(null)
    try {
      if (password.length < 8) throw new Error('Use at least 8 characters')
      if (password !== confirm) throw new Error('Passwords do not match')
      const user = await registerWithEmailPassword(email, password)
      router.replace(`/profile/${user.uid}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to register'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[420px] py-10">
      <h1 className="font-display text-2xl mb-6">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <div className="mb-4 inline-flex rounded-[10px] border border-[var(--gh-border)] overflow-hidden">
        <button
          onClick={() => setMode('signin')}
          className={`px-3 py-1 text-sm ${mode === 'signin' ? 'bg-[var(--gh-surface)] text-white' : 'text-[var(--gh-text-muted)] hover:text-white'}`}
        >Sign in</button>
        <button
          onClick={() => setMode('create')}
          className={`px-3 py-1 text-sm ${mode === 'create' ? 'bg-[var(--gh-surface)] text-white' : 'text-[var(--gh-text-muted)] hover:text-white'}`}
        >Create</button>
      </div>
      <div className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
        />
        {mode === 'create' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
          />
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {mode === 'signin' ? (
          <div className="flex gap-2">
            <button onClick={doSignIn} disabled={loading} className="rounded-[12px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black">{loading ? '...' : 'Sign in'}</button>
            <button type="button" onClick={() => setMode('create')} className="rounded-[12px] px-3 py-2 text-sm border border-[var(--gh-border)]">Create account</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={doRegister} disabled={loading} className="rounded-[12px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black">{loading ? '...' : 'Create account'}</button>
            <button type="button" onClick={() => setMode('signin')} className="rounded-[12px] px-3 py-2 text-sm border border-[var(--gh-border)]">I already have an account</button>
          </div>
        )}
      </div>
      
    </div>
  )
}


