import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_RECIPE_TYPES = ['main', 'side', 'salad', 'complete_meal'] as const
const VALID_MEAL_TYPES = ['breakfast', 'brunch', 'lunch', 'dinner', 'any'] as const

type RecipeType = typeof VALID_RECIPE_TYPES[number]
type MealType = typeof VALID_MEAL_TYPES[number]

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const { anon_id, name, raw_text, recipe_type, meal_type, source_url } = body

  if (!anon_id || typeof anon_id !== 'string') {
    return NextResponse.json({ error: 'Missing anon_id', code: 'MISSING_ANON_ID' }, { status: 400 })
  }
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing name', code: 'MISSING_NAME' }, { status: 400 })
  }
  if (!raw_text || typeof raw_text !== 'string') {
    return NextResponse.json({ error: 'Missing raw_text', code: 'MISSING_RAW_TEXT' }, { status: 400 })
  }
  if (!recipe_type || typeof recipe_type !== 'string') {
    return NextResponse.json({ error: 'Missing recipe_type', code: 'MISSING_RECIPE_TYPE' }, { status: 400 })
  }
  if (!VALID_RECIPE_TYPES.includes(recipe_type as RecipeType)) {
    return NextResponse.json(
      { error: `recipe_type must be one of: ${VALID_RECIPE_TYPES.join(', ')}`, code: 'INVALID_RECIPE_TYPE' },
      { status: 400 }
    )
  }
  if (!Array.isArray(meal_type) || meal_type.length === 0) {
    return NextResponse.json(
      { error: 'meal_type must be a non-empty array', code: 'MISSING_MEAL_TYPE' },
      { status: 400 }
    )
  }
  const mealTypeValue = meal_type[0] as string
  if (!VALID_MEAL_TYPES.includes(mealTypeValue as MealType)) {
    return NextResponse.json(
      { error: `Invalid meal_type. Must be one of: ${VALID_MEAL_TYPES.join(', ')}`, code: 'INVALID_MEAL_TYPE' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recipes')
    .insert({
      anon_id,
      user_id: null,
      name: name.slice(0, 120),
      raw_text,
      recipe_type,
      meal_type: mealTypeValue,
      source: 'user_imported',
      source_url:
        source_url && typeof source_url === 'string' ? source_url.slice(0, 500) : null,
    })
    .select('id, name, recipe_type, meal_type, source')
    .single()

  if (error) {
    console.error('[recipes/import] DB error', error)
    return NextResponse.json({ error: 'Could not save recipe', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ recipe: data })
}
