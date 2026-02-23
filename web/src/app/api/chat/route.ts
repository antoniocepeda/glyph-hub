import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createHash } from 'node:crypto'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'
import { RATE_LIMIT } from '@/lib/constants'
import { apiError } from '@/lib/api-response'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const MAX_MESSAGES = 50

function getChatFingerprint(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean)
  const ip = parts[0] || req.ip || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const accept = req.headers.get('accept-language') || ''
  return createHash('sha256').update(ip).update('|').update(ua).update('|').update(accept).digest('hex')
}

async function enforceChatRateLimit(fingerprint: string): Promise<void> {
  const db = getAdminDb()
  if (!db) return
  const now = Date.now()
  const minuteWindow = Math.floor(now / MINUTE_MS)
  const dayWindow = Math.floor(now / DAY_MS)
  const ref = db.collection('rate_limits').doc(`chat:${fingerprint}`)

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    let minuteCount = 0
    let dayCount = 0
    let storedMinuteWindow = minuteWindow
    let storedDayWindow = dayWindow

    if (snap.exists) {
      const data = snap.data() as {
        minuteWindow?: number; minuteCount?: number
        dayWindow?: number; dayCount?: number
      }
      storedMinuteWindow = data.minuteWindow ?? minuteWindow
      storedDayWindow = data.dayWindow ?? dayWindow
      minuteCount = storedMinuteWindow === minuteWindow ? (data.minuteCount ?? 0) : 0
      dayCount = storedDayWindow === dayWindow ? (data.dayCount ?? 0) : 0
    }

    if (minuteCount >= RATE_LIMIT.CHAT_PER_MINUTE) {
      throw new RateLimitError((storedMinuteWindow + 1) * MINUTE_MS)
    }
    if (dayCount >= RATE_LIMIT.CHAT_PER_DAY) {
      throw new RateLimitError((storedDayWindow + 1) * DAY_MS)
    }

    tx.set(ref, {
      minuteWindow, minuteCount: minuteCount + 1,
      dayWindow, dayCount: dayCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
}

class RateLimitError extends Error {
  constructor(public readonly retryAt: number) { super('rate_limited') }
}

function buildPrompt(messages: Msg[], _system?: string): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m && m.role === 'user' && m.content?.trim()) {
      return `User: ${m.content}\nAssistant:`
    }
  }
  const joined = messages.map(m => (m?.content || '')).filter(Boolean).join('\n')
  return joined ? `User: ${joined}\nAssistant:` : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { model, messages, system, temperature, maxTokens } = body
    if (!model || typeof model !== 'string') {
      return apiError('model required', 400)
    }
    if (!Array.isArray(messages)) {
      return apiError('messages array required', 400)
    }
    if (messages.length > MAX_MESSAGES) {
      return apiError('too many messages', 400)
    }

    const fingerprint = getChatFingerprint(req)
    try {
      await enforceChatRateLimit(fingerprint)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return apiError('rate_limited', 429, { retryAt: error.retryAt })
      }
      console.error('[chat] rate limit check failed', error)
    }

    const token = process.env['REPLICATE_API_TOKEN']
    if (!token) {
      return apiError('Server missing REPLICATE_API_TOKEN', 500)
    }

    const prompt = buildPrompt(messages as Msg[], typeof system === 'string' ? system : undefined)
    function getProfile(slug: string): { promptKey: string; systemKey: string | null; maxKey: string | null; tempKey: string } {
      const s = (slug || '').toLowerCase()
      const nonTextPatterns = [
        'stable-diffusion',
        'flux.1',
        'flash-image',
        'veo-',
        'pixverse',
        'hailuo',
        'ray-2',
        'gpt-image',
        'image-edit',
        'lyria',
      ]
      if (nonTextPatterns.some(p => s.includes(p))) {
        return { promptKey: 'prompt', systemKey: null, maxKey: null, tempKey: 'temperature' }
      }

      let promptKey = 'prompt'
      let systemKey: string | null = 'system'
      let maxKey: string | null = 'max_tokens'
      const tempKey = 'temperature'

      if (s.includes('claude')) {
        maxKey = 'max_output_tokens'
      }
      if (s.includes('deepseek')) {
        maxKey = 'max_new_tokens'
      }
      if (s.includes('granite')) {
        systemKey = 'system_prompt'
      }

      return { promptKey, systemKey, maxKey, tempKey }
    }
    const keys = getProfile(model)
    const input: Record<string, unknown> = {}
    input[keys.promptKey] = prompt
    if (typeof temperature === 'number') input[keys.tempKey] = temperature
    if (typeof maxTokens === 'number' && keys.maxKey) input[keys.maxKey] = maxTokens
    if (typeof system === 'string' && keys.systemKey) input[keys.systemKey] = system

    const replicate = new Replicate({ auth: token })
    const encoder = new TextEncoder()
    const DEBUG = process.env.NODE_ENV !== 'production'

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          const payload = typeof data === 'string' ? data : JSON.stringify(data)
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        }

        // Incremental concat helper
        let cumulative = ''
        const lcpLen = (a: string, b: string) => {
          const n = Math.min(a.length, b.length)
          let i = 0
          while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++
          return i
        }
        const emitSuffix = (out: string) => {
          if (!out) return
          let suffix = out
          if (cumulative) {
            const k = lcpLen(cumulative, out)
            suffix = out.slice(k)
          } else {
            // Raw mode: do not strip any leading labels; emit exactly what model outputs
            suffix = out
          }
          if (suffix) {
            cumulative = out
            send('token', suffix)
          } else {
            cumulative = out
          }
        }

        try {
          send('ready', 'ok')
          if (DEBUG) send('debug', 'route:sdk')

          const asText = (v: unknown): string => {
            if (v == null) return ''
            if (typeof v === 'string') return v
            if (Array.isArray(v)) return v.map((item: unknown) => asText(item)).join('')
            try { return JSON.stringify(v) } catch { return String(v) }
          }

          const runNonStreaming = async () => {
            try {
              if (DEBUG) send('debug', 'fallback:non-stream')
              const pred = await (replicate as unknown as { predictions: { create: (opts: Record<string, unknown>) => Promise<Record<string, unknown>> } }).predictions.create({ model, input })
              const id: string = pred?.id
              let attempts = 0
              while (attempts++ < 120) { // ~2 minutes max
                const cur = await (replicate as unknown as { predictions: { get: (id: string) => Promise<Record<string, unknown>> } }).predictions.get(id)
                const status = cur?.status
                if (status === 'succeeded' || status === 'completed') {
                  const text = asText(cur?.output)
                  if (text) send('token', text)
                  break
                }
                if (status === 'failed' || status === 'canceled') {
                  send('error', status || 'failed')
                  break
                }
                await new Promise(r => setTimeout(r, 1000))
              }
              send('done', 'done')
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'predict failed'
              send('error', msg)
              send('done', 'done')
            }
          }

          // Prefer SDK stream helper; fall back to predictions.create(stream) then non-stream
          let iter: AsyncIterable<Record<string, unknown>> | null = null
          try {
            iter = await (replicate as unknown as { stream: (model: string, opts: { input: Record<string, unknown> }) => Promise<AsyncIterable<Record<string, unknown>>> }).stream(model, { input })
            if (DEBUG) send('debug', 'sdk.stream')
          } catch (e) {
            try {
              const prediction = await (replicate as unknown as { predictions: { create: (opts: Record<string, unknown>) => Promise<AsyncIterable<Record<string, unknown>>> } }).predictions.create({ model, input, stream: true })
              iter = prediction as AsyncIterable<any>
              if (DEBUG) send('debug', 'predictions.create(stream)')
            } catch (e2) {
              // Streaming not supported — fallback to non-streaming polling
              await runNonStreaming()
              return
            }
          }

          let doneSent = false
          for await (const event of iter) {
            const type = (event && (event.type || event.event)) as string | undefined
            if (!type) continue
            if (type === 'output') {
              const text = typeof event.output === 'string' ? event.output
                : Array.isArray(event.output) ? (event.output as unknown[]).map(String).join('')
                : typeof event.data === 'string' ? event.data : ''
              if (text) emitSuffix(text)
            } else if (type === 'delta' || type === 'token') {
              const text = (event.delta || event.token || '').toString()
              if (text) send('token', text)
            } else if (type === 'completed' || type === 'done') {
              if (!doneSent) { send('done', 'done'); doneSent = true }
            } else if (type === 'error') {
              const errObj = event.error as Record<string, unknown> | undefined
              const msg = (errObj?.message || event.message || '').toString()
              if (/streaming not supported/i.test(msg)) {
                // Fallback on the fly
                await runNonStreaming()
                return
              }
              send('error', msg || 'error')
            } else if (DEBUG) {
              send('debug', `evt:${type}`)
            }
          }
          if (!doneSent) send('done', 'done')
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'stream error'
          send('error', msg)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'bad request'
    return apiError(msg, 400)
  }
}
