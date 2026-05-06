import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanSlot } from '@/lib/types'

const anthropic = new Anthropic()

// ── Types ────────────────────────────────────────────────────────────────────

interface IngredientInput {
  name: string
  quantity: number | string
  unit: string
}

interface StepV2Input {
  instruction: string
  tip_type?: 'TIMING' | 'DONENESS' | 'HEADS_UP' | 'CLEAN'
  tip_text?: string
}

interface PrepAheadInput {
  task: string
  time_sensitive: boolean
}

interface RecipeInput {
  name: string
  cuisine_type: string
  cook_time_minutes: number
  servings: number
  ingredients: IngredientInput[]
  steps_v2: StepV2Input[]
  prep_ahead: PrepAheadInput[]
  is_complete_meal: boolean
}

interface MealOutput {
  day: string
  recipe_name: string
  reasoning: string
  use_soon_priority: boolean
  recipe: RecipeInput
}

interface AIResponse {
  meals: MealOutput[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentWeekMonday(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  return monday.toISOString().split('T')[0]
}

function servingsFor(whoFor: string): number {
  if (whoFor === 'just_me') return 2
  if (whoFor === 'me_and_partner') return 2
  if (whoFor === 'family_young_kids') return 4
  if (whoFor === 'family_teens') return 5
  return 2
}

function timeBudgetLabel(budget: string | null): string {
  if (budget === 'under_30') return '30 minutes or less per weeknight'
  if (budget === 'hour_is_fine') return 'up to 60 minutes (you enjoy cooking)'
  return '30–45 minutes per weeknight'
}

function skillLabel(skill: string | null): string {
  if (skill === 'finding_my_feet') return 'beginner — simple techniques, familiar ingredients, clear instructions'
  if (skill === 'enjoy_challenge') return 'confident cook who enjoys complex methods and new techniques'
  return 'home cook comfortable with everyday techniques'
}

function whoForDescription(whoFor: string, servings: number): string {
  const s = `Serves ${servings}.`
  if (whoFor === 'just_me') return `Cooking for one. ${s} Practical, no waste.`
  if (whoFor === 'me_and_partner') return `Cooking for 2 adults. ${s}`
  if (whoFor === 'family_young_kids') return `Family with young children. ${s} Keep spice mild, textures familiar, nothing unusual for kids.`
  if (whoFor === 'family_teens') return `Family with teenagers. ${s} Bigger portions, bolder flavours welcome.`
  return `Cooking for 2. ${s}`
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Couldn't read the request." },
      { status: 400 }
    )
  }

  const { anon_id, pantry_input, week_context, use_soon } = body as {
    anon_id: string
    pantry_input: string
    week_context?: string
    use_soon?: string
  }

  if (!anon_id || typeof anon_id !== 'string') {
    return NextResponse.json({ error: 'anon_id is required.' }, { status: 400 })
  }
  if (!pantry_input || typeof pantry_input !== 'string') {
    return NextResponse.json({ error: 'pantry_input is required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Load preferences
  const { data: prefs } = await admin
    .from('user_preferences')
    .select('*')
    .eq('anon_id', anon_id)
    .maybeSingle()

  const whoFor: string = prefs?.who_cooking_for ?? 'just_me'
  const servings = servingsFor(whoFor)
  const primaryCuisine: string = prefs?.primary_cuisine ?? 'varied'
  const secondaryCuisines: string[] = prefs?.secondary_cuisines ?? []
  const dietaryRules: string | null = prefs?.dietary_rules ?? null
  const bannedIngredients: string | null = prefs?.banned_ingredients ?? null
  const skill: string | null = prefs?.skill_level ?? null
  const budget: string | null = prefs?.weeknight_budget ?? null

  // 2. Build prompt lines
  const cuisineBlock =
    secondaryCuisines.length > 0
      ? `Primary cuisine: ${primaryCuisine} (60–70% of meals). Also weave in: ${secondaryCuisines.join(', ')}.`
      : `Primary cuisine: ${primaryCuisine}. Most meals should reflect this.`

  const dietBlock = dietaryRules
    ? `DIETARY RULES (non-negotiable): ${dietaryRules}.`
    : 'No dietary restrictions.'

  const bannedBlock = bannedIngredients
    ? `NEVER use these ingredients: ${bannedIngredients}.`
    : ''

  const useSoonBlock = use_soon
    ? `USE-SOON PRIORITY: The user has these items that must be used this week: "${use_soon}". Assign meals that use them to Monday and/or Tuesday. The reasoning for those meals must explicitly name the ingredient.`
    : ''

  const weekContextBlock = week_context
    ? `WEEK CONTEXT: "${week_context}". Parse for busy nights (cook time ≤25 min) and occasion nights (go all-out on a treat meal).`
    : ''

  const systemPrompt = `You are a warm, knowledgeable meal planning assistant. You create practical, delicious weekly dinner plans tailored to the household. You always respond with valid JSON only — no markdown, no explanation, just the JSON object.`

  const userPrompt = `Generate a 7-dinner week plan for Mon–Sun.

HOUSEHOLD:
- ${whoForDescription(whoFor, servings)}
- Skill: ${skillLabel(skill)}
- Time budget: ${timeBudgetLabel(budget)}
- ${dietBlock}
${bannedBlock ? `- ${bannedBlock}` : ''}
- ${cuisineBlock}
${useSoonBlock ? `\n${useSoonBlock}` : ''}${weekContextBlock ? `\n${weekContextBlock}` : ''}

WHAT THEY HAVE IN THE KITCHEN:
${pantry_input}

RULES:
1. Every meal is a COMPLETE MEAL — protein + carb + vegetables in one dish or one pot. No separate sides needed.
2. No back-to-back meals using the same main protein.
3. Vary effort: lighter/quicker Monday–Thursday, more ambitious Friday–Sunday.
4. Weeknight cook times must respect the time budget above. Weekend meals can be longer.
5. Each recipe needs genuine prep_ahead tasks (things doable earlier in the day or the night before).
6. Reasoning is one casual, direct sentence — no "This dish provides…" openings. Write like a friend.
7. Include 5–8 steps_v2 per recipe. Add tip callouts only where genuinely useful.

TIP TYPES (optional, only when it adds real value):
- TIMING: warn about steps that take longer than expected
- DONENESS: how to know it's actually ready (not just timer-based)
- HEADS_UP: something that trips people up
- CLEAN: a clean-as-you-go moment that saves hassle

Respond with ONLY this JSON structure:
{
  "meals": [
    {
      "day": "Mon",
      "recipe_name": "string",
      "reasoning": "string",
      "use_soon_priority": false,
      "recipe": {
        "name": "string",
        "cuisine_type": "string",
        "cook_time_minutes": 30,
        "servings": ${servings},
        "ingredients": [
          { "name": "string", "quantity": 1, "unit": "string" }
        ],
        "steps_v2": [
          { "instruction": "string", "tip_type": "TIMING", "tip_text": "string" }
        ],
        "prep_ahead": [
          { "task": "string", "time_sensitive": false }
        ],
        "is_complete_meal": true
      }
    }
  ]
}

Generate all 7 days in order: Mon, Tue, Wed, Thu, Fri, Sat, Sun.`

  // 3. Call Claude
  let aiText: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    aiText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch {
    return NextResponse.json(
      { error: "Couldn't build your week. Give it one more try?" },
      { status: 500 }
    )
  }

  // 4. Parse JSON
  let parsed: AIResponse
  try {
    const match = aiText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    parsed = JSON.parse(match[0]) as AIResponse
    if (!Array.isArray(parsed.meals) || parsed.meals.length === 0) {
      throw new Error('meals array is empty')
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't build your week. Give it one more try?" },
      { status: 500 }
    )
  }

  // 5. Upsert recipes — check by name, insert if new, update if exists
  const recipeIdMap: Record<string, string> = {}

  for (const mealOut of parsed.meals) {
    const r = mealOut.recipe
    const recipeName = r.name ?? mealOut.recipe_name

    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('name', recipeName)
      .is('user_id', null)
      .maybeSingle()

    if (existing?.id) {
      await admin
        .from('recipes')
        .update({
          cuisine_type: r.cuisine_type,
          cook_time_minutes: r.cook_time_minutes,
          servings: r.servings,
          ingredients: r.ingredients,
          steps_v2: r.steps_v2,
          prep_ahead: r.prep_ahead,
          is_complete_meal: true,
          source_type: 'ai_generated',
        })
        .eq('id', existing.id)
      recipeIdMap[recipeName] = existing.id
    } else {
      const { data: inserted } = await admin
        .from('recipes')
        .insert({
          user_id: null,
          name: recipeName,
          cuisine_type: r.cuisine_type,
          meal_type: 'dinner',
          cook_time_minutes: r.cook_time_minutes,
          servings: r.servings,
          ingredients: r.ingredients,
          steps: [],
          steps_v2: r.steps_v2,
          prep_ahead: r.prep_ahead,
          is_complete_meal: true,
          batch_cookable: false,
          source_type: 'ai_generated',
          macros_per_serving: null,
          source_raw_text: null,
          source_url: null,
          user_rating: null,
          last_cooked_date: null,
        })
        .select('id')
        .single()

      if (inserted?.id) {
        recipeIdMap[recipeName] = inserted.id
      }
    }
  }

  // 6. Build slots array (GeneratedPlan shape — Kitchen backward compat)
  //    Kitchen reads week_plan.slots.slots, so we wrap in the GeneratedPlan envelope.
  const slotsArray: PlanSlot[] = parsed.meals.map(m => ({
    day: m.day,
    meal_type: 'dinner',
    recipe_id: recipeIdMap[m.recipe_name ?? m.recipe?.name] ?? null,
    recipe_name: m.recipe_name,
    protein_g: 0,
    carbs_g: 0,
    locked: false,
    eating_out: false,
  }))

  const generatedPlan = {
    slots: slotsArray,
    daily_totals: [],
    batch_opportunities: [],
  }

  // 7. Create week_plans row
  const weekStartDate = getCurrentWeekMonday()
  const { data: weekPlan, error: wpError } = await admin
    .from('week_plans')
    .insert({
      user_id: null,
      anon_id,
      week_start_date: weekStartDate,
      slots: generatedPlan,
      pantry_snapshot: pantry_input,
      week_context: week_context ?? null,
      use_soon_text: use_soon ?? null,
    })
    .select('id')
    .single()

  if (wpError || !weekPlan) {
    return NextResponse.json(
      { error: "Couldn't build your week. Give it one more try?" },
      { status: 500 }
    )
  }

  // 8. Create meals rows
  const mealRows = parsed.meals.map(m => ({
    week_plan_id: weekPlan.id,
    day: m.day,
    meal_type: 'dinner',
    recipe_name: m.recipe_name,
    eating_out: false,
    serve_with: null,
    reasoning: m.reasoning ?? null,
    cooked: false,
    cooked_at: null,
    swapped_from: null,
    verdict: null,
    verdict_shown: false,
    notes: null,
    use_soon_priority: m.use_soon_priority ?? false,
  }))

  const { data: insertedMeals, error: mealsError } = await admin
    .from('meals')
    .insert(mealRows)
    .select('*')

  if (mealsError) {
    return NextResponse.json(
      { error: "Couldn't build your week. Give it one more try?" },
      { status: 500 }
    )
  }

  // 9. Persist pantry snapshot to preferences
  await admin
    .from('user_preferences')
    .update({ last_pantry_input: pantry_input })
    .eq('anon_id', anon_id)

  return NextResponse.json({
    ok: true,
    week_plan_id: weekPlan.id,
    meals: insertedMeals ?? [],
    recipe_ids: recipeIdMap,
  })
}
