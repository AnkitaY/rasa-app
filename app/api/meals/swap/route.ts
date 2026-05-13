import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlternativeRecipe {
  name: string
  reasoning: string
  cuisine_type: string
  cook_time_minutes: number
  servings: number
  ingredients: { name: string; quantity: number | string; unit: string }[]
  steps_v2: { instruction: string; tip_type?: string; tip_text?: string }[]
  prep_ahead: { task: string; time_sensitive: boolean }[]
}

// ── POST — generate 3 alternatives ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { meal_id, reason, ingredient, free_text, meal_type } = body as {
    meal_id: string
    reason: string
    ingredient?: string
    free_text?: string
    meal_type?: string
  }

  if (!meal_id) {
    return NextResponse.json({ error: 'meal_id required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: meal } = await admin
    .from('meals')
    .select('recipe_name, week_plan_id, meal_type')
    .eq('id', meal_id)
    .single()

  if (!meal) {
    return NextResponse.json({ error: 'Meal not found.' }, { status: 404 })
  }

  const { data: weekPlan } = await admin
    .from('week_plans')
    .select('pantry_snapshot, anon_id')
    .eq('id', meal.week_plan_id)
    .single()

  const { data: prefs } = weekPlan?.anon_id
    ? await admin
        .from('user_preferences')
        .select('primary_cuisine, who_cooking_for, dietary_rules, weeknight_budget, skill_level, meal_prefs')
        .eq('anon_id', weekPlan.anon_id)
        .maybeSingle()
    : { data: null }

  const effectiveMealType = (meal_type ?? meal.meal_type ?? 'dinner') as string
  const pantryText = weekPlan?.pantry_snapshot ?? 'Not specified'

  // Build reason-specific AI instruction
  let reasonInstruction: string
  switch (reason) {
    case 'forgot_to_prep':
      reasonInstruction = `The user forgot to prep ahead. Suggest ONLY zero-prep alternatives — eggs, yoghurt bowls, overnight oats, toast-based meals. Nothing requiring advance work or prep_ahead steps. Target: prep_friendly recipes, assembly_time_mins ≤ 15 min.`
      break
    case 'no_time':
      reasonInstruction = `The user has no time. Suggest the fastest possible options for ${effectiveMealType}. Target: ≤ 20 min total (prep + cook or assemble). Prioritise low assembly_time_mins.`
      break
    case 'not_feeling_it':
      reasonInstruction = `The user is not feeling the current meal. Suggest a different mood/flavour profile — same approximate time budget, different cuisine or texture. Use week context and cuisine preferences to vary.`
      break
    case 'missing_ingredient':
      reasonInstruction = ingredient
        ? `The user is missing: ${ingredient}. Suggest meals that do NOT require ${ingredient}. If the original can be adapted without it, note that option first before a full replacement.`
        : `The user is missing an ingredient. Suggest versatile meals that work with common pantry staples.`
      break
    default:
      reasonInstruction = free_text ?? 'Suggest a good alternative for this meal.'
  }

  const servings = prefs?.who_cooking_for === 'family_young_kids' ? 4
    : prefs?.who_cooking_for === 'family_teens' ? 5 : 2

  const mealTypeLine = effectiveMealType === 'brunch' || effectiveMealType === 'breakfast'
    ? `This is a ${effectiveMealType} meal — high protein, assembles quickly (≤ 30 min). Must include a clear protein source.`
    : `This is a ${effectiveMealType} meal — complete meal (protein + carb + veg).`

  const timeLine = reason === 'no_time' || reason === 'forgot_to_prep'
    ? 'All alternatives must be under 20 minutes.'
    : prefs?.weeknight_budget === 'under_30'
    ? 'Keep cook/assembly times under 30 minutes.'
    : 'Aim for 30–45 minutes.'

  const prompt = `You are swapping a ${effectiveMealType} recipe. Generate exactly 3 alternative recipes.

CURRENT MEAL BEING SWAPPED: ${meal.recipe_name}
REASON: ${reasonInstruction}

WHAT THEY HAVE (pantry):
${pantryText}

CONSTRAINTS:
- ${mealTypeLine}
- ${timeLine}
- Dietary rules: ${prefs?.dietary_rules ?? 'none'}
- Cooking for: ${prefs?.who_cooking_for ?? 'just_me'} (servings: ${servings})
- Each alternative must use a DIFFERENT main protein from "${meal.recipe_name}"
- Must work with the pantry above — no extra shopping needed
- Reasoning is one casual sentence, NOT starting with "This dish"

Return ONLY valid JSON with no markdown:
{
  "alternatives": [
    {
      "name": "string",
      "reasoning": "string",
      "cuisine_type": "string",
      "cook_time_minutes": 25,
      "servings": ${servings},
      "ingredients": [{ "name": "string", "quantity": 1, "unit": "string" }],
      "steps_v2": [{ "instruction": "string" }],
      "prep_ahead": [{ "task": "string", "time_sensitive": false }]
    }
  ]
}`

  let aiText: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    })
    aiText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch {
    return NextResponse.json(
      { error: "Couldn't find alternatives. Give it one more try?" },
      { status: 500 }
    )
  }

  let parsed: { alternatives: AlternativeRecipe[] }
  try {
    const match = aiText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed.alternatives)) throw new Error('Bad shape')
  } catch {
    return NextResponse.json(
      { error: "Couldn't find alternatives. Give it one more try?" },
      { status: 500 }
    )
  }

  return NextResponse.json({ alternatives: parsed.alternatives })
}

// ── PATCH — apply chosen alternative ─────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { meal_id, chosen } = body as {
    meal_id: string
    chosen: AlternativeRecipe
  }

  if (!meal_id || !chosen?.name) {
    return NextResponse.json({ error: 'meal_id and chosen are required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existingMeal } = await admin
    .from('meals')
    .select('recipe_name, meal_type, week_plan_id')
    .eq('id', meal_id)
    .single()

  if (!existingMeal) {
    return NextResponse.json({ error: 'Meal not found.' }, { status: 404 })
  }

  const oldName = existingMeal.recipe_name ?? null
  const mealType = existingMeal.meal_type ?? 'dinner'

  const { data: planRow } = await admin
    .from('week_plans')
    .select('anon_id')
    .eq('id', existingMeal.week_plan_id)
    .maybeSingle()

  const anonId = planRow?.anon_id ?? null

  const recipeQuery = admin
    .from('recipes')
    .select('id')
    .eq('name', chosen.name)
    .is('user_id', null)

  const { data: existingRecipe } = anonId
    ? await recipeQuery.eq('anon_id', anonId).maybeSingle()
    : await recipeQuery.maybeSingle()

  if (!existingRecipe) {
    await admin.from('recipes').insert({
      anon_id: anonId,
      user_id: null,
      name: chosen.name,
      cuisine_type: chosen.cuisine_type,
      meal_type: mealType,
      cook_time_minutes: chosen.cook_time_minutes,
      servings: chosen.servings,
      ingredients: chosen.ingredients,
      steps: [],
      steps_v2: chosen.steps_v2,
      prep_ahead: chosen.prep_ahead,
      is_complete_meal: true,
      batch_cookable: false,
      source: 'ai_generated',
      source_type: 'ai_generated',
      macros_per_serving: null,
      source_raw_text: null,
      source_url: null,
      user_rating: null,
      last_cooked_date: null,
    })
  }

  const { data: updatedMeal, error } = await admin
    .from('meals')
    .update({
      recipe_name: chosen.name,
      swapped_from: oldName,
    })
    .eq('id', meal_id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Could not apply the swap.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, meal: updatedMeal })
}
