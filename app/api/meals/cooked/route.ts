import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/meals/cooked
 * Body: { meal_id: string }
 * Marks the meal as cooked and records the timestamp.
 */
export async function PATCH(request: NextRequest) {
  let body: { meal_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { meal_id } = body
  if (!meal_id) {
    return NextResponse.json({ error: 'meal_id required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('meals')
    .update({ cooked: true, cooked_at: new Date().toISOString() })
    .eq('id', meal_id)

  if (error) {
    return NextResponse.json({ error: 'Could not mark as cooked.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
