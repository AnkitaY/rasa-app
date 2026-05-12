import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/meals/current?anon_id=<uuid>
 * Returns the latest week_plan + its meals (non-deleted) for the given anon_id.
 * Enriches each meal with recipe_id, prep_ahead, assembly_time_mins, cook_time_minutes.
 */
export async function GET(request: NextRequest) {
  const anon_id = request.nextUrl.searchParams.get('anon_id')
  if (!anon_id) {
    return NextResponse.json({ error: 'anon_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

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

  // Exclude soft-deleted meals
  const { data: meals, error: mealsError } = await admin
    .from('meals')
    .select('*')
    .eq('week_plan_id', weekPlan.id)
    .is('deleted_at', null)

  if (mealsError) {
    return NextResponse.json({ error: 'Could not load meals.' }, { status: 500 })
  }

  const mealList = meals ?? []

  if (mealList.length === 0) {
    return NextResponse.json({ week_plan: weekPlan, meals: mealList })
  }

  // Enrich with recipe data — look up by name
  const names = mealList.map((m: { recipe_name: string }) => m.recipe_name)
  const { data: recipes } = await admin
    .from('recipes')
    .select('id, name, prep_ahead, assembly_time_mins, cook_time_minutes')
    .in('name', names)
    .is('user_id', null)

  const nameToRecipe: Record<string, {
    id: string
    prep_ahead: unknown
    assembly_time_mins: number | null
    cook_time_minutes: number | null
  }> = {}
  for (const r of recipes ?? []) {
    nameToRecipe[r.name] = r
  }

  const enriched = mealList.map((m: Record<string, unknown>) => {
    const recipe = nameToRecipe[m.recipe_name as string]
    return {
      ...m,
      recipe_id: recipe?.id ?? null,
      prep_ahead: recipe?.prep_ahead ?? null,
      assembly_time_mins: recipe?.assembly_time_mins ?? null,
      cook_time_minutes: recipe?.cook_time_minutes ?? null,
    }
  })

  return NextResponse.json({ week_plan: weekPlan, meals: enriched })
}
