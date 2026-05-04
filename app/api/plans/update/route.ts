import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanSlot, DailyTotal } from '@/lib/types'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan_id, slots, daily_totals, batch_opportunities } = body as {
      plan_id: string
      slots: PlanSlot[]
      daily_totals: DailyTotal[]
      batch_opportunities: Array<{ description: string }>
    }

    if (!plan_id) {
      return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })
    }

    const slotsPayload = {
      slots: slots ?? [],
      daily_totals: daily_totals ?? [],
      batch_opportunities: batch_opportunities ?? [],
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('week_plans')
      .update({ slots: slotsPayload })
      .eq('id', plan_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
