import { NextRequest, NextResponse } from 'next/server'
import { isLocalRequest } from '@/lib/ops/guard'
import { registry } from '@/lib/ops/dispatch'
import { loadAgents } from '@/lib/ops/parsers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isLocalRequest()) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }) }

  const agent = String(body.agent || '').trim()
  const prompt = String(body.prompt || '').trim()
  const permissionMode = body.permissionMode ? String(body.permissionMode) : undefined
  const model = body.model ? String(body.model) : undefined
  const maxBudgetUsd = typeof body.maxBudgetUsd === 'number' ? body.maxBudgetUsd : undefined

  if (!agent) return NextResponse.json({ error: 'agent is required' }, { status: 400 })
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  if (prompt.length > 20000) return NextResponse.json({ error: 'prompt too long (>20k chars)' }, { status: 400 })

  const agents = await loadAgents()
  if (!agents.find(a => a.name === agent)) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 })
  }

  const allowedModes = ['bypassPermissions', 'acceptEdits', 'plan', 'default', 'auto', 'dontAsk']
  if (permissionMode && !allowedModes.includes(permissionMode)) {
    return NextResponse.json({ error: `permissionMode must be one of ${allowedModes.join(', ')}` }, { status: 400 })
  }

  const job = await registry.start({ agent, prompt, permissionMode, model, maxBudgetUsd })
  return NextResponse.json({ id: job.id, status: job.status })
}
