"use client"
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { KB, type KbArticle } from '@/lib/kb'

export default function HelpIndex() {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return KB
    return KB.filter(a => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s) || a.category.toLowerCase().includes(s))
  }, [q])

  function Group({ title, items }: { title: string; items: KbArticle[] }) {
    return (
      <div>
        <h2 className="font-display text-xl mb-2">{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(a => (
            <Link key={a.slug} href={`/help/${a.slug}`} className="rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-4">
              <div className="font-medium">{a.title}</div>
              <div className="mt-1 text-xs text-[var(--gh-text-muted)]">{a.category}</div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const grouped = useMemo(() => {
    const map = new Map<string, KbArticle[]>()
    for (const a of results) {
      if (!map.has(a.category)) map.set(a.category, [])
      map.get(a.category)!.push(a)
    }
    return Array.from(map.entries())
  }, [results])

  return (
    <div className="mx-auto max-w-[900px] py-8">
      <h1 className="font-display text-2xl mb-4">Help Center</h1>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search help topics"
        className="w-full rounded-[12px] bg-[var(--gh-surface)] border border-[var(--gh-border)] px-3 py-2 text-sm mb-6"
      />
      <div className="space-y-8">
        {grouped.map(([cat, items]) => (
          <Group key={cat} title={cat} items={items} />
        ))}
        {grouped.length === 0 && <div className="text-sm text-[var(--gh-text-muted)]">No results.</div>}
      </div>
    </div>
  )
}


