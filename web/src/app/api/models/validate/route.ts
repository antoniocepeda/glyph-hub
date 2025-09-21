import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Replicate from 'replicate'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = (searchParams.get('slug') || '').trim()
  if (!slug || !slug.includes('/')) {
    return NextResponse.json({ ok: false, slug, message: 'Provide slug as owner/name' })
  }
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ ok: false, slug, message: 'Missing server token' })
  }
  try {
    const replicate = new Replicate({ auth: token }) as any
    let model: any | null = null
    try {
      if (replicate?.models?.get) model = await replicate.models.get(slug)
    } catch {}
    if (!model) {
      const res = await fetch(`https://api.replicate.com/v1/models/${encodeURIComponent(slug)}`, {
        headers: { 'Authorization': `Token ${token}` },
      })
      if (res.ok) model = await res.json()
    }
    if (!model) {
      return NextResponse.json({ ok: false, slug, message: 'Model not found' })
    }
    return NextResponse.json({ ok: true, slug, owner: model.owner || model.user, name: model.name || model.model })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    return NextResponse.json({ ok: false, slug, message: msg })
  }
}
