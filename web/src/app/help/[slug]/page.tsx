"use client"
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getKb } from '@/lib/kb'

export default function HelpArticle() {
  const params = useParams() as { slug: string }
  const a = getKb(params.slug)
  if (!a) return (
    <div className="mx-auto max-w-[900px] py-8">
      <div className="text-sm text-red-400">Article not found.</div>
      <Link href="/help" className="text-sm text-[var(--gh-cyan)]">Back to Help</Link>
    </div>
  )
  return (
    <div className="mx-auto max-w-[900px] py-8">
      <Link href="/help" className="text-sm text-[var(--gh-cyan)]">← All articles</Link>
      <h1 className="font-display text-2xl mb-2 mt-2">{a.title}</h1>
      <div className="text-xs text-[var(--gh-text-muted)] mb-4">{a.category}</div>
      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm">{a.body}</div>
    </div>
  )
}


