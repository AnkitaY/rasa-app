import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Ingredient, MacrosPerServing } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      anon_id,
      name,
      cuisine_type,
      meal_type,
      servings,
      cook_time_minutes,
      ingredients,
      steps,
      macros_per_serving,
      batch_cookable,
    } = body as {
      anon_id: string
      name: string
      cuisine_type: string | null
      meal_type: string | null
      servings: number
      cook_time_minutes: number | null
      ingredients: Ingredient[]
      steps: string[]
      macros_per_serving: MacrosPerServing
      batch_cookable: boolean
    }

    if (!anon_id || typeof anon_id !== 'string') {
      return NextResponse.json({ error: 'anon_id is required', code: 'MISSING_ANON_ID' }, { status: 400 })
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'At least one ingredient is required' }, { status: 400 })
    }

    const recipeToSave = {
      anon_id,
      user_id: null,
      name: name.trim(),
      cuisine_type: cuisine_type?.trim() || null,
      meal_type: meal_type?.trim() || null,
      servings: servings ?? 2,
      cook_time_minutes: cook_time_minutes ?? null,
      ingredients,
      steps: steps.filter((s) => s.trim() !== ''),
      macros_per_serving,
      batch_cookable: batch_cookable ?? false,
      source_type: 'manual',
      source_raw_text: null,
    }

    const adminClient = createAdminClient()
    const { data: savedRecipe, error: dbError } = await adminClient
      .from('recipes')
      .insert(recipeToSave)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ recipe: savedRecipe }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
