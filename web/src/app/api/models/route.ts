import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CURATED_MODELS, CURATED_MODEL_BY_SLUG } from '@/lib/replicateCurated'

type ModelInfo = {
  slug: string
  owner: string
  name: string
  displayName?: string
  description?: string
  category?: string
}

const CURATED_SLUG_SET = new Set(CURATED_MODELS.map(m => m.slug))

function resolveRequestedSlugs(slugsParam: string | null): string[] {
  if (!slugsParam) return CURATED_MODELS.map(m => m.slug)
  const requested = slugsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(slug => CURATED_SLUG_SET.has(slug))
  return requested.length > 0 ? requested : CURATED_MODELS.map(m => m.slug)
}

export async function GET(req: NextRequest) {
  const token = process.env['REPLICATE_API_TOKEN']
  const { searchParams } = new URL(req.url)
  const requestedSlugs = resolveRequestedSlugs(searchParams.get('slugs'))

  const filteredFallback = requestedSlugs
    .map(slug => {
      const meta = CURATED_MODEL_BY_SLUG.get(slug)
      if (!meta) return null
      return {
        slug: meta.slug,
        owner: meta.owner,
        name: meta.name,
        displayName: meta.displayName,
        description: meta.description,
        category: meta.category,
      }
    })
    .filter(Boolean) as ModelInfo[]

  if (!token) {
    return NextResponse.json({ curated: filteredFallback, source: 'fallback' }, { status: 200 })
  }

  const curated: ModelInfo[] = []
  let anyDynamic = false
  for (const slug of requestedSlugs) {
    const fallback = CURATED_MODEL_BY_SLUG.get(slug)
    if (!fallback) continue
    try {
      const res = await fetch(`https://api.replicate.com/v1/models/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (res.ok) {
        const model = await res.json()
        curated.push({
          slug,
          owner: (model.owner || model.user || fallback.owner || '').toString() || fallback.owner,
          name: (model.name || model.model || fallback.name || '').toString() || fallback.name,
          displayName: (model.display_name || model.pretty_name || model.name || fallback.displayName || '').toString() || fallback.displayName,
          description: (model.description || model.readme || fallback.description || '').toString() || fallback.description,
          category: fallback.category,
        })
        anyDynamic = true
        continue
      }
    } catch {
      // ignore errors and fall back to static metadata
    }
    curated.push({
      slug: fallback.slug,
      owner: fallback.owner,
      name: fallback.name,
      displayName: fallback.displayName,
      description: fallback.description,
      category: fallback.category,
    })
  }

  if (curated.length === 0) {
    return NextResponse.json({ curated: filteredFallback, source: 'fallback' }, { status: 200 })
  }

  return NextResponse.json({ curated, source: anyDynamic ? 'replicate' : 'fallback' }, { status: 200 })
}
