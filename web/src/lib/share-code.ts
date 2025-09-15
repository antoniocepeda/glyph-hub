import { deflate, inflate } from 'pako'
import { PromptSchema, canonicalizePrompt, type PromptInput } from './validators'
import CRC32 from 'crc-32'

const base64url = {
  encode: (u8: Uint8Array) =>
    Buffer.from(u8)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, ''),
  decode: (s: string) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
}

function crc32(u8: Uint8Array): string {
  return (CRC32.buf(u8) >>> 0).toString(16).padStart(8, '0')
}

export function encodeShareCode(prompt: PromptInput): string {
  const canonical = canonicalizePrompt(PromptSchema.parse(prompt))
  const json = JSON.stringify(canonical)
  const deflated = deflate(new TextEncoder().encode(json))
  const payload = base64url.encode(deflated)
  const crc = crc32(deflated)
  return `PB1.${payload}.${crc}`
}

export function decodeShareCode(code: string): PromptInput {
  const [prefix, payload, crc] = code.split('.')
  if (prefix !== 'PB1') throw new Error('Unsupported version')
  if (!payload || !crc) throw new Error('Malformed code')
  const bytes = base64url.decode(payload)
  if (crc32(bytes) !== crc) throw new Error('CRC mismatch')
  const json = new TextDecoder().decode(inflate(bytes))
  return PromptSchema.parse(JSON.parse(json))
}


