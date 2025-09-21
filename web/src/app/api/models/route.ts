import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Replicate from 'replicate'

type ModelInfo = {
  slug: string
  owner: string
  name: string
  displayName?: string
  description?: string
}

const FALLBACK_CURATED: ModelInfo[] = [
  { slug: 'meta/meta-llama-3-8b-instruct', owner: 'meta', name: 'meta-llama-3-8b-instruct', displayName: 'Llama 3 8B Instruct', description: 'Fast, capable open LLM for chat.' },
  { slug: 'meta/meta-llama-3-70b-instruct', owner: 'meta', name: 'meta-llama-3-70b-instruct', displayName: 'Llama 3 70B Instruct', description: 'Large open LLM for stronger reasoning.' },
  { slug: 'mistralai/mixtral-8x7b-instruct', owner: 'mistralai', name: 'mixtral-8x7b-instruct', displayName: 'Mixtral 8x7B Instruct', description: 'MoE model with strong performance.' },
  { slug: 'google/gemma-2-9b-it', owner: 'google', name: 'gemma-2-9b-it', displayName: 'Gemma 2 9B IT', description: 'Instruction-tuned Gemma 2.' },
  { slug: 'microsoft/phi-3-mini-4k-instruct', owner: 'microsoft', name: 'phi-3-mini-4k-instruct', displayName: 'Phi-3 Mini 4K Instruct', description: 'Small, efficient model for quick tasks.' },
]

function parseEnvSlugs(): string[] {
  const raw = process.env.REPLICATE_COLLECTION_SLUGS || 'text-generation,open-source-llms'
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function GET(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  const { searchParams } = new URL(req.url)
  const slugsParam = searchParams.get('slugs')
  const collections = slugsParam ? slugsParam.split(',').map(s => s.trim()).filter(Boolean) : parseEnvSlugs()

  if (!token) {
    // Return fallback curated when token missing
    return NextResponse.json({ curated: FALLBACK_CURATED, source: 'fallback' }, { status: 200 })
  }

  try {
    const replicate = new Replicate({ auth: token }) as any
    const out: Record<string, ModelInfo> = {}
    for (const slug of collections) {
      try {
        // Try SDK collection method; if unavailable, fall back to REST
        let models: any[] | null = null
        if (replicate?.collections?.get) {
          const col = await replicate.collections.get(slug)
          models = col?.models || col?.items || null
        }
        if (!models) {
          const res = await fetch(`https://api.replicate.com/v1/collections/${encodeURIComponent(slug)}`, {
            headers: { 'Authorization': `Token ${token}` },
          })
          if (res.ok) {
            const j = await res.json()
            models = j?.models || j?.items || null
          }
        }
        if (Array.isArray(models)) {
          for (const m of models) {
            const owner = (m.owner || m.user || '').toString()
            const name = (m.name || m.model || '').toString()
            if (!owner || !name) continue
            const slug = `${owner}/${name}`
            if (!out[slug]) out[slug] = {
              slug,
              owner,
              name,
              displayName: (m.display_name || m.pretty_name || m.name || '').toString() || undefined,
              description: (m.description || m.readme || '').toString() || undefined,
            }
          }
        }
      } catch {
        // ignore collection errors; continue
      }
    }
    const curated = Object.values(out)
    if (curated.length === 0) {
      return NextResponse.json({ curated: FALLBACK_CURATED, source: 'fallback' }, { status: 200 })
    }
    return NextResponse.json({ curated, source: 'replicate' }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ curated: FALLBACK_CURATED, source: 'fallback' }, { status: 200 })
  }
}
