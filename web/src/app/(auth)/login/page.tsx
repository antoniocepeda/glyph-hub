"use client"
import { useState } from 'react'
import { registerWithEmailPassword, signInWithEmailPassword } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  

  async function doSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailPassword(email, password)
    } catch (e: any) {
      setError(e.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  async function doRegister() {
    setLoading(true)
    setError(null)
    try {
      await registerWithEmailPassword(email, password)
    } catch (e: any) {
      setError(e.message || 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[420px] py-10">
      <h1 className="font-display text-2xl mb-6">Sign in</h1>
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={doSignIn} disabled={loading} className="rounded-[12px] px-3 py-2 text-sm bg-[var(--gh-cyan)] text-black">{loading ? '...' : 'Sign in'}</button>
          <button onClick={doRegister} disabled={loading} className="rounded-[12px] px-3 py-2 text-sm border border-[var(--gh-border)]">Create account</button>
        </div>
      </div>
      
    </div>
  )
}


