"use client"
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { KB, type KbArticle } from '@/lib/kb'
import { BookOpen, Share2, FolderOpen, UserCircle2, Shield, Wrench, Search, X } from 'lucide-react'

type Category = KbArticle['category']

function CategoryIcon({ category }: { category: Category }) {
  const cls = "h-4 w-4"
  switch (category) {
    case 'Getting Started':
      return <BookOpen className={cls} />
    case 'Sharing':
      return <Share2 className={cls} />
    case 'Collections':
      return <FolderOpen className={cls} />
    case 'Profiles':
      return <UserCircle2 className={cls} />
    case 'Safety':
      return <Shield className={cls} />
    case 'Advanced':
    default:
      return <Wrench className={cls} />
  }
}

function CategoryChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
        selected
          ? 'bg-[var(--gh-cyan)] text-black border-[var(--gh-cyan)]'
          : 'bg-[var(--gh-bg-soft)] text-[var(--gh-text-muted)] border-[var(--gh-border)] hover:text-[var(--gh-text)]'
      }`}
    >
      {label}
    </button>
  )
}

export default function HelpIndex() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<'All' | Category>('All')

  const categories = useMemo(() => ['All', ...Array.from(new Set(KB.map(a => a.category))) as Category[]], [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    let base = KB
    if (category !== 'All') base = base.filter(a => a.category === category)
    if (!s) return base
    return base.filter(a => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s))
  }, [q, category])

  const featured = useMemo(() => KB.slice(0, 2), [])

  const grouped = useMemo(() => {
    const map = new Map<string, KbArticle[]>()
    for (const a of results) {
      if (!map.has(a.category)) map.set(a.category, [])
      map.get(a.category)!.push(a)
    }
    return Array.from(map.entries())
  }, [results])

  return (
    <div className="mx-auto max-w-[1000px] py-6">
      <section className="rounded-[16px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-5 mb-6">
        <h1 className="font-display text-2xl">Help Center</h1>
        <p className="mt-1 text-sm text-[var(--gh-text-muted)]">Find guides and answers about using GlyphHub.</p>
        <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-bg)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--gh-text-muted)]" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search help topics"
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Search help topics"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map(cat => (
            <CategoryChip key={cat} label={cat} selected={category === cat} onClick={() => setCategory(cat as typeof category)} />
          ))}
        </div>
      </section>

      {!q && category === 'All' && (
        <section className="mb-6">
          <h2 className="font-display text-xl mb-2 text-[var(--gh-text-dim)]">Featured</h2>
          <div className="rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] divide-y divide-[var(--gh-border)]">
            {featured.map(a => (
              <Link
                key={a.slug}
                href={`/help/${a.slug}`}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--gh-bg-soft)] transition"
              >
                <CategoryIcon category={a.category} />
                <span className="font-medium hover:text-[var(--gh-cyan)]">{a.title}</span>
                <span className="ml-auto text-xs text-[var(--gh-text-muted)]">{a.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        {grouped.map(([cat, items]) => (
          <div key={cat}>
            <h2 className="font-display text-lg mb-2 text-[var(--gh-text-dim)]">{cat}</h2>
            <div className="rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] divide-y divide-[var(--gh-border)]">
              {items.map(a => (
                <Link
                  key={a.slug}
                  href={`/help/${a.slug}`}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--gh-bg-soft)] transition"
                >
                  <CategoryIcon category={a.category} />
                  <span className="font-medium hover:text-[var(--gh-cyan)]">{a.title}</span>
                  <span className="ml-auto text-xs text-[var(--gh-text-muted)]">{a.category}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-6 text-sm text-[var(--gh-text-muted)]">
            No results. Try a different search or browse by category above.
          </div>
        )}
      </section>
    </div>
  )
}


