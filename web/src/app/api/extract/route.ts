import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400 })
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'GlyphHubBot/1.0' } })
    const html = await res.text()
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    // naive text extraction fallback
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    return Response.json({ title, body })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'fetch failed' }), { status: 500 })
  }
}


