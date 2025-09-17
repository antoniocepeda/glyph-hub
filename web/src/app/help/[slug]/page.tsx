"use client"
import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getKb, KB } from '@/lib/kb'
import { ArrowLeft, BookOpen, Share2, FolderOpen, UserCircle2, Shield, Wrench, ChevronRight } from 'lucide-react'

function CategoryBadge({ category }: { category: string }) {
  const iconCls = "h-3.5 w-3.5"
  const Icon = (() => {
    switch (category) {
      case 'Getting Started':
        return BookOpen
      case 'Sharing':
        return Share2
      case 'Collections':
        return FolderOpen
      case 'Profiles':
        return UserCircle2
      case 'Safety':
        return Shield
      case 'Advanced':
      default:
        return Wrench
    }
  })()
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gh-border)] bg-[var(--gh-bg-soft)] px-2 py-0.5 text-[10px] text-[var(--gh-text-muted)]">
      <Icon className={iconCls} />
      {category}
    </span>
  )
}

export default function HelpArticle() {
  const params = useParams() as { slug: string }
  const a = getKb(params.slug)
  // Hooks must be called unconditionally
  const related = useMemo(() => {
    if (!a) return [] as typeof KB
    return KB.filter(x => x.slug !== a.slug && (x.category === a.category || x.title.split(' ').some(w => a.title.includes(w)))).slice(0, 6)
  }, [a])
  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; slug: string }[]>()
    for (const item of KB) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push({ title: item.title, slug: item.slug })
    }
    return Array.from(map.entries())
  }, [])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [menuOpen, setMenuOpen] = useState(false)

  if (!a) return (
    <div className="mx-auto max-w-[1000px] py-6">
      <div className="rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-4 mb-3 text-sm text-red-400">Article not found.</div>
      <Link href="/help" className="inline-flex items-center gap-2 text-sm text-[var(--gh-cyan)]">
        <ArrowLeft className="h-4 w-4" /> Back to Help
      </Link>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1100px] py-6 grid grid-cols-1 lg:grid-cols-[210px,1fr] gap-6">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--gh-border)] bg-[var(--gh-surface)] px-3 py-1.5 text-xs text-[var(--gh-text-dim)] hover:text-[var(--gh-text)]"
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-90' : ''}`} />
            Browse
          </button>
          {menuOpen && (
            <div className="relative">
              <div className="absolute z-50 mt-2 w-[280px] rounded-[10px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-2 shadow-[var(--gh-shadow-2)]">
                <nav className="max-h-[60svh] overflow-y-auto pr-1" role="menu">
                  {grouped.map(([cat, items]) => {
                    const isOpen = open[cat] ?? (cat === a.category)
                    return (
                      <div key={cat} className="mb-1">
                        <button
                          type="button"
                          onClick={() => setOpen(v => ({ ...v, [cat]: !isOpen }))}
                          className="w-full inline-flex items-center justify-between rounded-[8px] px-2 py-1 text-[11px] text-left text-[var(--gh-text-dim)] hover:bg-[var(--gh-bg-soft)]"
                          aria-expanded={isOpen}
                        >
                          <span className="inline-flex items-center gap-2">
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            {cat}
                          </span>
                          <span className="text-[10px] text-[var(--gh-text-muted)]">{items.length}</span>
                        </button>
                        {isOpen && (
                          <div className="mt-0.5 grid gap-0.5 pl-5">
                            {items.map(item => (
                              <Link
                                key={item.slug}
                                href={`/help/${item.slug}`}
                                className={`rounded-[6px] px-2 py-0.5 text-xs leading-5 hover:bg-[var(--gh-bg-soft)] ${
                                  item.slug === a.slug ? 'bg-[var(--gh-bg-soft)] text-[var(--gh-text)]' : 'text-[var(--gh-text-muted)]'
                                }`}
                              >
                                {item.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>
            </div>
          )}
        </div>
      </aside>
      <article>
        <div className="mb-3 flex items-center gap-2">
          <Link href="/help" className="inline-flex items-center gap-2 text-xs text-[var(--gh-cyan)]">
            <ArrowLeft className="h-4 w-4" />
            All articles
          </Link>
          <CategoryBadge category={a.category} />
        </div>
        <div className="rounded-[16px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-6 shadow-[var(--gh-shadow-1)]">
          <h1 className="font-display text-2xl">{a.title}</h1>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm mt-3">{a.body}</div>
        </div>

        {related.length > 0 && (
          <section className="mt-6">
            <div className="text-sm text-[var(--gh-text-dim)] mb-2">Related</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map(r => (
                <Link key={r.slug} href={`/help/${r.slug}`} className="group rounded-[12px] border border-[var(--gh-border)] bg-[var(--gh-surface)] p-4 hover:border-[var(--gh-cyan)] transition">
                  <div className="font-medium group-hover:text-[var(--gh-cyan)]">{r.title}</div>
                  <div className="mt-1 text-xs text-[var(--gh-text-muted)]">{r.category}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}


