import { NextResponse } from 'next/server'
import { isLocalRequest } from '@/lib/ops/guard'
import { registry } from '@/lib/ops/dispatch'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  if (!isLocalRequest()) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const jobs = await registry.listWithHistory()
  return NextResponse.json({ jobs })
}
