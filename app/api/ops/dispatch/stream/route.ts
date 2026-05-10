import { NextRequest } from 'next/server'
import { isLocalRequest } from '@/lib/ops/guard'
import { registry, DispatchEvent } from '@/lib/ops/dispatch'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!isLocalRequest()) return new Response('Not found', { status: 404 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return new Response('id required', { status: 400 })

  const job = registry.get(id)

  // For completed jobs, replay events from disk
  if (!job) {
    const events = await registry.loadEvents(id)
    const meta = await registry.loadJob(id)
    if (!meta) return new Response('Job not found', { status: 404 })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const ev of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ts: Date.now(), kind: 'status', data: { status: meta.status, exitCode: meta.exitCode, costUsd: meta.costUsd, numTurns: meta.numTurns, durationMs: meta.durationMs } })}\n\n`))
        controller.close()
      },
    })
    return sseResponse(stream)
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (ev: DispatchEvent) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`)) } catch { /* */ }
      }
      // Backlog
      for (const ev of job.events) send(ev)
      send({ ts: Date.now(), kind: 'status', data: { status: job.status, exitCode: job.exitCode } })

      if (job.status !== 'running') {
        closed = true
        controller.close()
        return
      }

      const onEvent = (ev: DispatchEvent) => send(ev)
      const onEnd = () => {
        send({
          ts: Date.now(),
          kind: 'status',
          data: { status: job.status, exitCode: job.exitCode, costUsd: job.costUsd, numTurns: job.numTurns, durationMs: job.durationMs },
        })
        if (!closed) {
          closed = true
          try { controller.close() } catch { /* */ }
        }
      }
      job.subscribers.add(onEvent)
      job.endSubscribers.add(onEnd)

      const heartbeat = setInterval(() => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`: ping\n\n`)) } catch { /* */ }
      }, 15000)

      const cleanup = () => {
        job.subscribers.delete(onEvent)
        job.endSubscribers.delete(onEnd)
        clearInterval(heartbeat)
      }
      req.signal.addEventListener('abort', cleanup)
    },
  })
  return sseResponse(stream)
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
