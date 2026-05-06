import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/meals/current?anon_id=<uuid>
 * Returns the latest week_plan + its meals for the given anon_id.
 * Enriches each meal with recipe_id (looked up by recipe_name).
 */
export async function GET(request: NextRequest) {
  const anon_id = request.nextUrl.searchParams.get('anon_id')
  if (!anon_id) {
    return NextResponse.json({ error: 'anon_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Latest week_plan for this anon_id
  const { data: weekPlan, error: wpError } = await admin
    .from('week_plans')
    .select('id, week_start_date, created_at')
    .eq('anon_id', anon_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (wpError) {
    return NextResponse.json({ error: 'Could not load your plan.' }, { status: 500 })
  }

  if (!weekPlan) {
    return NextResponse.json({ week_plan: null, meals: [] })
  }

  // Meals for this plan
  const { data: meals, error: mealsError } = await admin
    .from('meals')
    .select('*')
    .eq('week_plan_id', weekPlan.id)

  if (mealsError) {
    return NextResponse.json({ error: 'Could not load meals.' }, { status: 500 })
  }

  const mealList = meals ?? []

  // Enrich with recipe_id — look up by name in recipes table
  if (mealList.length > 0) {
    const names = mealList.map((m: { recipe_name: string }) => m.recipe_name)
    const { data: recipes } = await admin
      .from('recipes')
      .select('id, name')
      .in('name', names)
      .is('user_id', null)

    const nameToId: Record<string, string> = {}
    for (const r of recipes ?? []) {
      nameToId[r.name] = r.id
    }

    const enriched = mealList.map((m: Record<string, unknown>) => ({
      ...m,
      recipe_id: nameToId[m.recipe_name as string] ?? null,
    }))

    return NextResponse.json({ week_plan: weekPlan, meals: enriched })
  }

  return NextResponse.json({ week_plan: weekPlan, meals: mealList })
}
