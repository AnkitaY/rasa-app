import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

interface IngredientInput {
  name: string
  quantity: number | string
  unit: string
}

interface StepV2Input {
  instruction: string
  tip_type?: string
  tip_text?: string
}

interface GeneratedRecipe {
  name: string
  cuisine_type: string
  cook_time_minutes: number
  servings: number
  ingredients: IngredientInput[]
  steps_v2: StepV2Input[]
  prep_ahead?: unknown
  assembly_time_mins?: number
}

interface GeneratedMeal {
  recipe_name: string
  reasoning: string
  recipe: GeneratedRecipe
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function servingsFor(whoFor: string): number {
  if (whoFor === 'just_me') return 2
  if (whoFor === 'me_and_partner') return 2
  if (whoFor === 'family_young_kids') return 4
  if (whoFor === 'family_teens') return 5
  return 2
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/meals/generate-single
 * Body: { anon_id, week_plan_id, day, meal_type }
 *
 * Generates one meal for a specific [day × meal_type] slot, saves it, and
 * returns the enriched meal row.
 */
export async function POST(request: NextRequest) {
  let body: {
    anon_id?: string
    week_plan_id?: string
    day?: string
    meal_type?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { anon_id, week_plan_id, day, meal_type } = body

  if (!anon_id) return NextResponse.json({ error: 'anon_id required.' }, { status: 400 })
  if (!week_plan_id) return NextResponse.json({ error: 'week_plan_id required.' }, { status: 400 })
  if (!day) return NextResponse.json({ error: 'day required.' }, { status: 400 })
  if (!meal_type) return NextResponse.json({ error: 'meal_type required.' }, { status: 400 })

  const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const validMealTypes = ['breakfast', 'lunch', 'dinner']
  if (!validDays.includes(day)) {
    return NextResponse.json({ error: 'Invalid day.' }, { status: 400 })
  }
  if (!validMealTypes.includes(meal_type)) {
    return NextResponse.json({ error: 'Invalid meal_type.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Fetch user prefs
  const { data: prefs } = await admin
    .from('user_preferences')
    .select('*')
    .eq('anon_id', anon_id)
    .maybeSingle()

  const whoFor = (prefs?.who_cooking_for as string) ?? 'me_and_partner'
  const servings = servingsFor(whoFor)
  const dietaryRules: string = (prefs?.dietary_rules as string) ?? ''
  const primaryCuisine: string = (prefs?.primary_cuisine as string) ?? 'any'
  const bannedIngredients: string = (prefs?.banned_ingredients as string) ?? ''
  const pantryInput: string = (prefs?.last_pantry_input as string) ?? 'standard pantry staples'
  const healthGoals: string = (prefs?.health_goals as string) ?? 'high protein, balanced'

  // 2. Build a simple prompt for a single meal
  const dietBlock = dietaryRules
    ? `DIETARY RULES (non-negotiable): ${dietaryRules}.`
    : 'No dietary restrictions.'
  const bannedBlock = bannedIngredients
    ? `Never use: ${bannedIngredients}.`
    : ''

  const systemPrompt = `You are a meal planning assistant. Respond with valid JSON only — no markdown, no explanation.`

  const userPrompt = `Generate one ${meal_type} recipe for ${day}.

HOUSEHOLD:
- Servings: ${servings}
- Cuisine: ${primaryCuisine}
- ${dietBlock}
${bannedBlock ? `- ${bannedBlock}` : ''}
- Health goal: ${healthGoals}

PANTRY / WHAT THEY HAVE:
${pantryInput}

RULES:
- Must be a complete meal with protein + carb + vegetables.
- ${meal_type === 'breakfast' ? 'Quick (≤20 min).' : 'Weeknight-friendly (≤45 min).'}
- One casual sentence of reasoning — write like a friend.

Respond with ONLY this JSON:
{
  "recipe_name": "string",
  "reasoning": "string",
  "recipe": {
    "name": "string",
    "cuisine_type": "string",
    "cook_time_minutes": 30,
    "servings": ${servings},
    "ingredients": [
      { "name": "string", "quantity": 1, "unit": "string" }
    ],
    "steps_v2": [
      { "instruction": "string" }
    ],
    "prep_ahead": null,
    "assembly_time_mins": null
  }
}`

  // 3. Call Claude (or return mock data)
  let generated: GeneratedMeal
  if (process.env.MOCK_AI === 'true') {
    const mockNames: Record<string, string> = {
      breakfast: 'Masala Omelette with Toast',
      lunch: 'Dal Tadka with Jeera Rice',
      dinner: 'Butter Chicken with Basmati Rice',
    }
    const name = mockNames[meal_type] ?? 'Quick Stir Fry'
    generated = {
      recipe_name: name,
      reasoning: `Good pick for ${day} — quick, filling, and uses what you have.`,
      recipe: {
        name,
        cuisine_type: 'Indian',
        cook_time_minutes: 30,
        servings,
        ingredients: [
          { name: 'Main ingredient', quantity: 200, unit: 'g' },
          { name: 'Spices', quantity: 1, unit: 'tbsp' },
          { name: 'Oil', quantity: 1, unit: 'tbsp' },
        ],
        steps_v2: [
          { instruction: 'Prep all ingredients.' },
          { instruction: 'Cook on medium heat for the required time.' },
          { instruction: 'Season to taste and serve hot.' },
        ],
        prep_ahead: null,
        assembly_time_mins: undefined,
      },
    }
  } else {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const rawText = msg.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')

      generated = JSON.parse(rawText) as GeneratedMeal
    } catch {
      return NextResponse.json({ error: 'Failed to generate meal.' }, { status: 500 })
    }
  }

  if (!generated.recipe_name || !generated.recipe) {
    return NextResponse.json({ error: 'Invalid generation response.' }, { status: 500 })
  }

  const recipe = generated.recipe

  // 4. Save recipe row
  const { data: recipeRow, error: recipeError } = await admin
    .from('recipes')
    .insert({
      anon_id,
      name: recipe.name,
      cuisine_type: recipe.cuisine_type ?? null,
      meal_type,
      servings: recipe.servings,
      cook_time_minutes: recipe.cook_time_minutes ?? null,
      ingredients: recipe.ingredients ?? [],
      steps_v2: recipe.steps_v2 ?? [],
      prep_ahead: recipe.prep_ahead ?? null,
      assembly_time_mins: recipe.assembly_time_mins ?? null,
      source: 'ai_generated',
      recipe_type: 'complete_meal',
      prep_friendly: false,
      excluded_from_plans: false,
      batch_cookable: false,
      source_type: 'ai_generated',
      user_id: null,
    })
    .select('id, prep_ahead, assembly_time_mins, cook_time_minutes')
    .single()

  if (recipeError || !recipeRow) {
    return NextResponse.json({ error: 'Failed to save recipe.' }, { status: 500 })
  }

  // 5. Save meal row
  const { data: mealRow, error: mealError } = await admin
    .from('meals')
    .insert({
      week_plan_id,
      day,
      meal_type,
      recipe_name: generated.recipe_name,
      reasoning: generated.reasoning ?? null,
      cooked: false,
      cooked_at: null,
      eating_out: false,
      serve_with: null,
      use_soon_priority: false,
      verdict: null,
      verdict_shown: false,
      notes: null,
      swapped_from: null,
      deleted_at: null,
    })
    .select('*')
    .single()

  if (mealError || !mealRow) {
    return NextResponse.json({ error: 'Failed to save meal.' }, { status: 500 })
  }

  // 6. Return enriched meal
  const enrichedMeal = {
    ...mealRow,
    recipe_id: recipeRow.id,
    prep_ahead: recipeRow.prep_ahead ?? null,
    assembly_time_mins: recipeRow.assembly_time_mins ?? null,
    cook_time_minutes: recipeRow.cook_time_minutes ?? null,
  }

  return NextResponse.json({ meal: enrichedMeal })
}
