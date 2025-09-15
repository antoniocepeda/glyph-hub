"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function run() {
    setError(null)
    setLoading(true)
    try {
      const q = new URLSearchParams({ url })
      const res = await fetch(`/api/extract?${q}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract')
      const draft = {
        title: data.title || 'Imported Prompt',
        body: data.body || '',
        tags: [],
        sourceUrl: url,
        visibility: 'public',
      }
      sessionStorage.setItem('gh_new_prompt_draft', JSON.stringify(draft))
      router.push('/new')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[720px] py-8">
      <h1 className="font-display text-2xl mb-4">Import from Link</h1>
      <div className="space-y-3">
        <input
          placeholder="Paste URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm"
        />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button onClick={run} disabled={loading} className="rounded-[12px] px-4 py-2 text-sm bg-[var(--gh-cyan)] text-black">{loading ? 'Importing…' : 'Import'}</button>
      </div>
    </div>
  )
}


