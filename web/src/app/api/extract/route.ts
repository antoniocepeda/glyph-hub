import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Simple SSRF guardrails and fetch hardening for import extraction
// - https only
// - host/IP validation (block private/loopback/link-local/multicast, localhost, onion)
// - timeout + response size cap

const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_MAX_BYTES = 200_000 // ~200 KB

function getEnvList(key: string): string[] {
  const raw = process.env[key]
  if (!raw) return []
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

function isForbiddenHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === 'ip6-localhost') return true
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.onion')) return true
  return false
}

function ipToNumberV4(ip: string): number {
  return ip.split('.').map(n => parseInt(n, 10)).reduce((acc, oct) => (acc << 8) + (oct & 255), 0) >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipToNumberV4(ip)
  // 10.0.0.0/8
  if ((n & 0xff000000) === 0x0a000000) return true
  // 172.16.0.0/12
  if ((n & 0xfff00000) === 0xac100000) return true
  // 192.168.0.0/16
  if ((n & 0xffff0000) === 0xc0a80000) return true
  // 127.0.0.0/8 loopback
  if ((n & 0xff000000) === 0x7f000000) return true
  // 169.254.0.0/16 link-local
  if ((n & 0xffff0000) === 0xa9fe0000) return true
  // 100.64.0.0/10 CGNAT
  if ((n & 0xffc00000) === 0x64400000) return true
  // 0.0.0.0/8
  if ((n & 0xff000000) === 0x00000000) return true
  // 224.0.0.0/4 multicast & 240.0.0.0/4 reserved
  if ((n & 0xf0000000) === 0xe0000000) return true
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  return s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80:')
}

function isAbortError(error: unknown): error is { name: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  )
}

async function isForbiddenHostOrIp(urlObj: URL): Promise<boolean> {
  const host = urlObj.hostname
  if (isForbiddenHostname(host)) return true
  // Allow/deny lists take precedence
  const allow = new Set(getEnvList('IMPORT_ALLOW_HOSTS'))
  const deny = new Set(getEnvList('IMPORT_DENY_HOSTS'))
  if (allow.size > 0 && !allow.has(host.toLowerCase())) return true
  if (deny.size > 0 && deny.has(host.toLowerCase())) return true

  // If hostname is a literal IP, check it; otherwise attempt DNS resolution.
  const isV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)
  const isV6 = host.includes(':')
  try {
    if (isV4) return isPrivateIPv4(host)
    if (isV6) return isPrivateIPv6(host)
    // DNS resolve A/AAAA; if any address is private/loopback/link-local, reject
    const dnsModule = (await import('node:dns')) as typeof import('node:dns')
    const dns = dnsModule.promises
    const results: string[] = []
    try {
      const a = await dns.resolve4(host)
      results.push(...a)
    } catch {}
    try {
      const aaaa = await dns.resolve6(host)
      results.push(...aaaa)
    } catch {}
    // If DNS returns no results, err on the safe side and block
    if (results.length === 0) return true
    for (const ip of results) {
      if (/\./.test(ip) ? isPrivateIPv4(ip) : isPrivateIPv6(ip)) return true
    }
  } catch {
    // If DNS fails unexpectedly, err on the safe side and block
    return true
  }
  return false
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  if (!target) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let urlObj: URL
  try {
    urlObj = new URL(target)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (urlObj.protocol !== 'https:') {
    return NextResponse.json({ error: 'https required' }, { status: 400 })
  }
  if (await isForbiddenHostOrIp(urlObj)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
  }

  const timeoutMs = Number(process.env.IMPORT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  const maxBytes = Number(process.env.IMPORT_MAX_BYTES || DEFAULT_MAX_BYTES)
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(urlObj.toString(), {
      headers: { 'user-agent': 'GlyphHubBot/1.0' },
      signal: ac.signal,
      redirect: 'follow',
    })
    if (!res.ok) {
      return NextResponse.json({ error: `fetch failed (${res.status})` }, { status: 502 })
    }
    const contentType = res.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      // Not HTML-like, but allow a small text response
    }

    // Enforce content-length if present
    const len = Number(res.headers.get('content-length') || '0')
    if (len > 0 && len > maxBytes) {
      return NextResponse.json({ error: 'content too large' }, { status: 413 })
    }

    // Stream with cap
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: 'no body' }, { status: 502 })
    }
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        received += value.byteLength
        if (received > maxBytes) {
          try { reader.cancel() } catch {}
          return NextResponse.json({ error: 'content too large' }, { status: 413 })
        }
      }
    }
    const out = new Uint8Array(received)
    {
      let offset = 0
      for (const ch of chunks) { out.set(ch, offset); offset += ch.byteLength }
    }
    const html = new TextDecoder('utf-8').decode(out)
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    return NextResponse.json({ title, body })
  } catch (e: unknown) {
    if (isAbortError(e)) {
      return NextResponse.json({ error: 'timeout' }, { status: 504 })
    }
    const msg = e instanceof Error ? e.message : 'fetch failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    clearTimeout(to)
  }
}
