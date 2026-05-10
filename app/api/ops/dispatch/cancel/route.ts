import { NextRequest, NextResponse } from 'next/server'
import { isLocalRequest } from '@/lib/ops/guard'
import { registry } from '@/lib/ops/dispatch'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isLocalRequest()) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }) }
  const id = String(body.id || '').trim()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const ok = registry.cancel(id)
  return NextResponse.json({ ok })
}
