import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Replicate from 'replicate'

// Streaming chat proxy using Replicate SDK
// Body: { model, messages, system?, temperature?, maxTokens?, apiKey? }
// SSE events: ready, debug, token, done, error

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

function buildPrompt(messages: Msg[], _system?: string): string {
  // Use the latest user message and cue assistant
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
    const { model, messages, system, temperature, maxTokens, apiKey } = await req.json()
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'model required' }, { status: 400 })
    }
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const token = (apiKey as string) || process.env.REPLICATE_API_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'Server missing REPLICATE_API_TOKEN' }, { status: 500 })
    }

    const prompt = buildPrompt(messages as Msg[], typeof system === 'string' ? system : undefined)
    function getProfile(slug: string) {
      const s = (slug || '').toLowerCase()
      // Defaults work for many instruct models
      let promptKey = 'prompt'
      let systemKey = 'system_prompt'
      let maxKey = 'max_tokens'
      let tempKey = 'temperature'
      if (s.includes('mixtral') || s.includes('phi-3') || s.includes('qwen')) {
        // Common variants using max_new_tokens
        maxKey = 'max_new_tokens'
      }
      // Some models use 'system' instead of 'system_prompt'
      if (s.includes('gemma')) {
        systemKey = 'system'
      }
      return { promptKey, systemKey, maxKey, tempKey }
    }
    const keys = getProfile(model)
    const input: Record<string, unknown> = {}
    input[keys.promptKey] = prompt
    if (typeof temperature === 'number') input[keys.tempKey] = temperature
    if (typeof maxTokens === 'number') input[keys.maxKey] = maxTokens
    if (typeof system === 'string') input[keys.systemKey] = system

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

          const asText = (v: any): string => {
            if (v == null) return ''
            if (typeof v === 'string') return v
            if (Array.isArray(v)) return v.map(asText).join('')
            try { return JSON.stringify(v) } catch { return String(v) }
          }

          const runNonStreaming = async () => {
            try {
              if (DEBUG) send('debug', 'fallback:non-stream')
              const pred = await (replicate as any).predictions.create({ model, input })
              const id: string = pred?.id
              let attempts = 0
              while (attempts++ < 120) { // ~2 minutes max
                const cur = await (replicate as any).predictions.get(id)
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
          let iter: AsyncIterable<any> | null = null
          try {
            iter = await (replicate as any).stream(model, { input })
            if (DEBUG) send('debug', 'sdk.stream')
          } catch (e) {
            try {
              const prediction = await (replicate as any).predictions.create({ model, input, stream: true })
              iter = prediction as AsyncIterable<any>
              if (DEBUG) send('debug', 'predictions.create(stream)')
            } catch (e2) {
              // Streaming not supported — fallback to non-streaming polling
              await runNonStreaming()
              return
            }
          }

          let doneSent = false
          for await (const event of (iter as AsyncIterable<any>)) {
            const type = (event && (event.type || event.event)) as string | undefined
            if (!type) continue
            if (type === 'output') {
              const text = typeof event.output === 'string' ? event.output
                : Array.isArray(event.output) ? (event.output as any[]).join('')
                : typeof event.data === 'string' ? event.data : ''
              if (text) emitSuffix(text)
            } else if (type === 'delta' || type === 'token') {
              const text = (event.delta || event.token || '').toString()
              if (text) send('token', text)
            } else if (type === 'completed' || type === 'done') {
              if (!doneSent) { send('done', 'done'); doneSent = true }
            } else if (type === 'error') {
              const msg = (event.error?.message || event.message || '').toString()
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
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
