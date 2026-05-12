import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/meals/remove
 * Body: { meal_id: string }
 * Soft-deletes the meal slot — sets deleted_at, no AI replacement.
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
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', meal_id)

  if (error) {
    return NextResponse.json({ error: 'Could not remove meal.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
