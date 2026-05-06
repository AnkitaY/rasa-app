import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/preferences/save
 * Upserts user_preferences for a given anon_id.
 * Accepts any subset of preference fields — only provided fields are written.
 * On first save, missing required fields get sensible defaults.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { anon_id, ...fields } = body

  if (!anon_id || typeof anon_id !== 'string') {
    return NextResponse.json({ error: 'anon_id required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check whether a row already exists for this anon_id
  const { data: existing, error: fetchError } = await admin
    .from('user_preferences')
    .select('id')
    .eq('anon_id', anon_id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: 'Could not reach the database.' }, { status: 500 })
  }

  if (existing) {
    // Partial update — only touch the fields that were sent
    const { error: updateError } = await admin
      .from('user_preferences')
      .update(fields)
      .eq('anon_id', anon_id)

    if (updateError) {
      return NextResponse.json({ error: 'Could not save your preferences.' }, { status: 500 })
    }
  } else {
    // First save — merge with defaults for required columns
    const defaults: Record<string, unknown> = {
      who_cooking_for: 'just_me',
      secondary_cuisines: [],
      goals: [],
      cook_days_per_week: 5,
      dietary_rules: null,
      primary_cuisine: null,
      skill_level: null,
      weeknight_budget: null,
      banned_ingredients: null,
      last_pantry_input: null,
    }

    const { error: insertError } = await admin
      .from('user_preferences')
      .insert({ ...defaults, ...fields, anon_id })

    if (insertError) {
      return NextResponse.json({ error: 'Could not save your preferences.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
