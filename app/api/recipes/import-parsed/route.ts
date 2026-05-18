import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VARIANT_SIGNALS = ['air fryer', 'airfryer', 'quick', 'one pot', 'one-pot', 'instant pot']

function buildSuggestedName(
  baseName: string,
  existingNames: string[],
  rawText: string
): string {
  const lowerRaw = rawText.toLowerCase()
  const signal = VARIANT_SIGNALS.find((s) => lowerRaw.includes(s))

  if (signal) {
    const suffix = signal.charAt(0).toUpperCase() + signal.slice(1)
    return `${baseName} — ${suffix}`
  }

  let version = 2
  const versionedPattern = new RegExp(`^${escapeRegex(baseName)} — v(\\d+)$`, 'i')
  for (const n of existingNames) {
    const match = versionedPattern.exec(n)
    if (match) {
      const v = parseInt(match[1], 10)
      if (v >= version) version = v + 1
    }
  }

  return `${baseName} — v${version}`
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  const { anon_id, name, meal_type, recipe_type, source_url, cook_time_minutes, servings, cuisine_type, ingredients, steps_v2, raw_text } = body

  if (!anon_id || typeof anon_id !== 'string') {
    return NextResponse.json({ error: 'Missing anon_id', code: 'MISSING_ANON_ID' }, { status: 400 })
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Recipe name is required', code: 'MISSING_NAME' }, { status: 400 })
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'Recipe must have at least one ingredient', code: 'MISSING_INGREDIENTS' }, { status: 400 })
  }
  if (!Array.isArray(steps_v2) || steps_v2.length === 0) {
    return NextResponse.json({ error: 'Recipe must have at least one step', code: 'MISSING_STEPS' }, { status: 400 })
  }

  const trimmedName = (name as string).trim()

  if (trimmedName.length > 120) {
    return NextResponse.json(
      { error: 'Recipe name is too long (max 120 characters).', code: 'NAME_TOO_LONG' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: existingRecipes, error: listError } = await admin
    .from('recipes')
    .select('name')
    .eq('anon_id', anon_id as string)
    .is('deleted_at', null)

  if (listError) {
    console.error('[import-parsed] list error', listError)
    return NextResponse.json(
      { error: 'Something went wrong. Give it one more try?', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  const existingNames = (existingRecipes ?? []).map((r) => r.name as string)
  const isDuplicate = existingNames.some(
    (n) => n.trim().toLowerCase() === trimmedName.toLowerCase()
  )

  if (isDuplicate) {
    const suggestedName = buildSuggestedName(
      trimmedName,
      existingNames,
      typeof raw_text === 'string' ? raw_text : ''
    )
    return NextResponse.json(
      { error: `You've already saved a recipe called "${trimmedName}".`, code: 'DUPLICATE_NAME', suggestedName },
      { status: 409 }
    )
  }

  const { data, error: insertError } = await admin
    .from('recipes')
    .insert({
      anon_id: anon_id as string,
      user_id: null, // pre-auth anonymous: no user_id until Phase 2
      name: trimmedName,
      meal_type: meal_type ?? null,
      cook_time_minutes: cook_time_minutes ?? null,
      servings: servings ?? null,
      cuisine_type: cuisine_type ?? null,
      ingredients,
      steps: [],
      steps_v2,
      raw_text: typeof raw_text === 'string' ? raw_text.slice(0, 20000) : null,
      recipe_type: typeof recipe_type === 'string' ? recipe_type : 'complete_meal',
      source_url: typeof source_url === 'string' && source_url ? source_url : null,
      source: 'user_imported',
      source_type: 'user_imported',
      is_complete_meal: true,
      excluded_from_plans: false,
    })
    .select('id, name')
    .single()

  if (insertError) {
    console.error('[import-parsed] insert error', insertError)
    return NextResponse.json(
      { error: 'Something went wrong while saving. Give it one more try?', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({ recipe: data }, { status: 201 })
}
