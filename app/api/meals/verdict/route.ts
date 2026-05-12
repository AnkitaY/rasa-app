import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/meals/verdict
 * Body: { meal_id, verdict?: 'loved' | 'ok' | 'skip', dismiss?: boolean }
 *
 * - verdict provided → sets verdict + verdict_shown = true
 * - dismiss: true    → sets verdict_shown = true only (no verdict)
 * - verdict = 'skip' → also sets excluded_from_plans = true on the linked recipe
 */
export async function PATCH(request: NextRequest) {
  let body: { meal_id?: string; verdict?: string; dismiss?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { meal_id, verdict, dismiss } = body

  if (!meal_id) {
    return NextResponse.json({ error: 'meal_id required.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { verdict_shown: true }
  if (!dismiss && verdict) {
    const allowed = ['loved', 'ok', 'skip']
    if (!allowed.includes(verdict)) {
      return NextResponse.json({ error: 'verdict must be loved, ok, or skip.' }, { status: 400 })
    }
    update.verdict = verdict
  }

  const admin = createAdminClient()

  // Fetch recipe_name before the verdict update if we need to exclude the recipe
  let recipeName: string | null = null
  if (!dismiss && verdict === 'skip') {
    const { data: meal } = await admin
      .from('meals')
      .select('recipe_name')
      .eq('id', meal_id)
      .maybeSingle()
    recipeName = meal?.recipe_name ?? null
  }

  const { error } = await admin
    .from('meals')
    .update(update)
    .eq('id', meal_id)

  if (error) {
    return NextResponse.json({ error: 'Could not save your verdict.' }, { status: 500 })
  }

  // Exclude the recipe from future plans when user says "Won't make again"
  if (recipeName) {
    await admin
      .from('recipes')
      .update({ excluded_from_plans: true })
      .eq('name', recipeName)
      .is('user_id', null)
  }

  return NextResponse.json({ ok: true })
}
