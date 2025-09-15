"use client"
import { useEffect, useState } from 'react'
import { getDb } from '@/lib/firebase'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'

export default function PerfPage() {
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    async function run() {
      const db = getDb()
      if (!db) return
      const t0 = performance.now()
      const snaps = await getDocs(query(collection(db, 'prompts'), orderBy('updatedAt', 'desc'), limit(5)))
      const t1 = performance.now()
      setLogs(prev => [...prev, `Initial query: ${Math.round(t1 - t0)}ms, ${snaps.size} docs`])
    }
    run()
  }, [])

  return (
    <div className="mx-auto max-w-[720px] py-8">
      <h1 className="font-display text-2xl mb-4">Dev: Performance</h1>
      <div className="space-y-2 text-sm">
        {logs.map((l, i) => (
          <div key={i} className="rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3">{l}</div>
        ))}
        {logs.length === 0 && <div className="text-[var(--gh-text-muted)]">Running…</div>}
      </div>
    </div>
  )
}


