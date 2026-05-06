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

  const { meal_id, reason, ingredient, free_text } = body as {
    meal_id: string
    reason: string
    ingredient?: string
    free_text?: string
  }

  if (!meal_id) {
    return NextResponse.json({ error: 'meal_id required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load meal + week_plan in parallel
  const { data: meal } = await admin
    .from('meals')
    .select('recipe_name, week_plan_id')
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

  // Load user prefs for context
  const { data: prefs } = weekPlan?.anon_id
    ? await admin
        .from('user_preferences')
        .select('primary_cuisine, who_cooking_for, dietary_rules, weeknight_budget, skill_level')
        .eq('anon_id', weekPlan.anon_id)
        .maybeSingle()
    : { data: null }

  const pantryText = weekPlan?.pantry_snapshot ?? 'Not specified'

  // Build reason description
  let reasonContext = reason
  if (reason === 'missing_ingredient' && ingredient) {
    reasonContext = `missing ingredient: ${ingredient}`
  } else if (reason === 'no_time') {
    reasonContext = 'no time tonight — needs to be quick (under 25 min)'
  } else if (free_text) {
    reasonContext = free_text
  }

  const servings = prefs?.who_cooking_for === 'family_young_kids' ? 4
    : prefs?.who_cooking_for === 'family_teens' ? 5 : 2

  const timeLine = reason === 'no_time'
    ? 'All alternatives must be under 25 minutes.'
    : prefs?.weeknight_budget === 'under_30'
    ? 'Keep cook times under 30 minutes.'
    : 'Aim for 30–45 minutes.'

  const prompt = `You are swapping a dinner recipe. Generate exactly 3 alternative complete-meal dinner recipes.

CURRENT MEAL BEING SWAPPED: ${meal.recipe_name}
REASON: ${reasonContext}

WHAT THEY HAVE (pantry):
${pantryText}

CONSTRAINTS:
- ${timeLine}
- Dietary rules: ${prefs?.dietary_rules ?? 'none'}
- Cooking for: ${prefs?.who_cooking_for ?? 'just_me'} (servings: ${servings})
- Skill: ${prefs?.skill_level ?? 'home cook'}
- Each alternative must use a DIFFERENT main protein from "${meal.recipe_name}"
- Each must be a COMPLETE MEAL (protein + carb + veg in one dish)
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
      model: 'claude-sonnet-4-20250514',
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

  // Get old recipe name before updating
  const { data: existingMeal } = await admin
    .from('meals')
    .select('recipe_name')
    .eq('id', meal_id)
    .single()

  const oldName = existingMeal?.recipe_name ?? null

  // Upsert the new recipe into the recipe bank
  const { data: existingRecipe } = await admin
    .from('recipes')
    .select('id')
    .eq('name', chosen.name)
    .is('user_id', null)
    .maybeSingle()

  if (!existingRecipe) {
    await admin.from('recipes').insert({
      user_id: null,
      name: chosen.name,
      cuisine_type: chosen.cuisine_type,
      meal_type: 'dinner',
      cook_time_minutes: chosen.cook_time_minutes,
      servings: chosen.servings,
      ingredients: chosen.ingredients,
      steps: [],
      steps_v2: chosen.steps_v2,
      prep_ahead: chosen.prep_ahead,
      is_complete_meal: true,
      batch_cookable: false,
      source_type: 'ai_generated',
      macros_per_serving: null,
      source_raw_text: null,
      source_url: null,
      user_rating: null,
      last_cooked_date: null,
    })
  }

  // Update the meal
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
