# GlyphHub — Share Code Specification

This document defines the format and reference algorithms for GlyphHub share codes.

---

## 1) Goals

- Compact, human-pastable format
- Offline encode/decode (no network required)
- Backward-compatible via versioned prefix

---

## 2) Format

```
PB1.<payload>.<crc>
```

- `PB1`: version identifier (PromptBin v1 → kept for compatibility)
- `<payload>`: base64url-encoded, deflated canonical JSON
- `<crc>`: CRC32 (hex, lowercase) of the deflated bytes

Example (truncated):

```
PB1.eJyrVkrLz1eyUkpKLFKqBQA1pwU6.c9a4b2e1
```

---

## 3) Canonical JSON schema

Minimal fields for a prompt snapshot:

```json
{
  "title": "string",
  "body": "string",
  "tags": ["string"],
  "sourceUrl": "string | null",
  "visibility": "public | unlisted | private"
}
```

Canonicalization rules:
- Keys ordered: `title`, `body`, `tags`, `sourceUrl`, `visibility`
- Strings are trimmed; `\r\n` normalized to `\n` in `body`
- `tags` lowercased; duplicates removed; sorted lexicographically
- Omit unknown fields

Notes:
- UI-only metadata such as `preferredModel`, `description`, and `howToUse` are not encoded in the share code. The share code captures only the minimal, portable prompt fields above.

---

## 4) Encoding (reference)

1. Build canonical JSON string with the rules above
2. Deflate using zlib stream (pako `deflate`)
3. Base64url-encode without padding
4. Compute CRC32 over the deflated bytes (hex, lowercase)
5. Join as `PB1.<payload>.<crc>`

---

## 5) Decoding (reference)

1. Validate prefix `PB1` and that there are exactly 3 segments
2. Base64url-decode `<payload>` to bytes
3. Compute CRC32 over bytes and compare to `<crc>` (hex)
4. Inflate bytes (pako `inflate`) to UTF-8 JSON
5. Parse JSON and validate with `zod`

---

## 6) Pseudocode (TypeScript)

```ts
import { deflate, inflate } from 'pako'
import { z } from 'zod'
import CRC32 from 'crc-32'

const PromptSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().url().nullable().default(null),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
})

type Prompt = z.infer<typeof PromptSchema>

const base64url = {
  encode: (u8: Uint8Array) => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
  decode: (s: string) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
}

function crc32(u8: Uint8Array): string {
  return (CRC32.buf(u8) >>> 0).toString(16).padStart(8, '0')
}

function canonicalize(p: Prompt): Prompt {
  const title = p.title.trim()
  const body = p.body.replace(/\r\n/g, '\n').trim()
  const tags = Array.from(new Set((p.tags || []).map(t => t.trim().toLowerCase()))).sort()
  const sourceUrl = p.sourceUrl || null
  const visibility = p.visibility || 'public'
  return { title, body, tags, sourceUrl, visibility }
}

export function encodeShareCode(prompt: Prompt): string {
  const canonical = canonicalize(PromptSchema.parse(prompt))
  const json = JSON.stringify(canonical)
  const deflated = deflate(new TextEncoder().encode(json))
  const payload = base64url.encode(deflated)
  const crc = crc32(deflated)
  return `PB1.${payload}.${crc}`
}

export function decodeShareCode(code: string): Prompt {
  const [prefix, payload, crc] = code.split('.')
  if (prefix !== 'PB1') throw new Error('Unsupported version')
  if (!payload || !crc) throw new Error('Malformed code')
  const bytes = base64url.decode(payload)
  if (crc32(bytes) !== crc) throw new Error('CRC mismatch')
  const json = new TextDecoder().decode(inflate(bytes))
  return PromptSchema.parse(JSON.parse(json))
}
```

---

## 7) Constraints & notes

- Typical codes remain short; long `body` increases size — prefer shortener links if needed
- No PII is encoded; share codes are content-only
- Version bump to `PB2` if schema or algorithm changes
- Decoding should work entirely offline
- When copying from a prompt view that includes `{{variables}}`, substitutions are applied before encoding; the PB1 code represents the filled version at copy time.
