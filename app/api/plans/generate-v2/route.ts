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

interface PrepAheadLegacy {
  task: string
  time_sensitive: boolean
}

interface PrepAheadV2 {
  tonight: string
  tomorrow: string
}

interface RecipeInput {
  name: string
  cuisine_type: string
  cook_time_minutes: number
  servings: number
  ingredients: IngredientInput[]
  steps_v2: StepV2Input[]
  prep_ahead: PrepAheadV2 | PrepAheadLegacy[]
  prep_friendly?: boolean
  assembly_time_mins?: number
  is_complete_meal: boolean
}

interface MealOutput {
  day: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  recipe_name: string
  reasoning: string
  use_soon_priority: boolean
  protein_source: string
  carb_base: string
  bank_recipe_id?: string | null
  recipe: RecipeInput
}

interface BankRecipe {
  id: string
  name: string
  meal_type: string | null
  source: string | null
  raw_text: string | null
  steps_v2: unknown
}

// ── Mock data (MOCK_AI=true in .env.local) ───────────────────────────────────

const MOCK_BREAKFASTS = [
  { name: 'Masala Omelette with Toast', cuisine: 'Indian', protein: 'eggs', carb: 'bread', time: 15 },
  { name: 'Poha with Peanuts', cuisine: 'Indian', protein: 'peanuts', carb: 'poha', time: 20 },
  { name: 'Avocado Toast with Poached Eggs', cuisine: 'Western', protein: 'eggs', carb: 'bread', time: 15 },
  { name: 'Moong Dal Chilla', cuisine: 'Indian', protein: 'moong dal', carb: 'dal', time: 25 },
  { name: 'Greek Yogurt Parfait with Granola', cuisine: 'Western', protein: 'yogurt', carb: 'granola', time: 10 },
]

const MOCK_LUNCHES = [
  { name: 'Dal Tadka with Jeera Rice', cuisine: 'Indian', protein: 'dal', carb: 'rice', time: 30 },
  { name: 'Paneer Bhurji with Roti', cuisine: 'Indian', protein: 'paneer', carb: 'roti', time: 25 },
  { name: 'Chicken and Hummus Wrap', cuisine: 'Mediterranean', protein: 'chicken', carb: 'wrap', time: 20 },
]

const MOCK_DINNERS = [
  { name: 'Butter Chicken with Basmati Rice', cuisine: 'Indian', protein: 'chicken', carb: 'rice', time: 40 },
  { name: 'Rajma Masala with Steamed Rice', cuisine: 'Indian', protein: 'rajma', carb: 'rice', time: 45 },
  { name: 'Paneer Tikka Masala with Naan', cuisine: 'Indian', protein: 'paneer', carb: 'naan', time: 35 },
  { name: 'Egg Curry with Rice', cuisine: 'Indian', protein: 'eggs', carb: 'rice', time: 30 },
  { name: 'Grilled Lemon Herb Chicken with Vegetables', cuisine: 'Western', protein: 'chicken', carb: 'vegetables', time: 35 },
  { name: 'Chana Masala with Bhatura', cuisine: 'Indian', protein: 'chana', carb: 'bhatura', time: 40 },
  { name: 'Palak Paneer with Roti', cuisine: 'Indian', protein: 'paneer', carb: 'roti', time: 35 },
]

function buildMockMeal(
  day: string,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  index: number,
): MealOutput {
  const pool =
    mealType === 'breakfast' ? MOCK_BREAKFASTS
    : mealType === 'lunch' ? MOCK_LUNCHES
    : MOCK_DINNERS
  const m = pool[index % pool.length]
  return {
    day,
    meal_type: mealType,
    recipe_name: m.name,
    reasoning: `Good pick for ${day} — quick, filling, and uses what you have.`,
    use_soon_priority: false,
    protein_source: m.protein,
    carb_base: m.carb,
    bank_recipe_id: null,
    recipe: {
      name: m.name,
      cuisine_type: m.cuisine,
      cook_time_minutes: m.time,
      servings: 4,
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
      prep_ahead: [],
      is_complete_meal: true,
    },
  }
}

function buildMockMeals(
  daySelections: Record<string, string[]>,
): MealOutput[] {
  const meals: MealOutput[] = []
  const counters: Record<string, number> = {}

  for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
    const days = daySelections[mealType] ?? []
    for (const day of days) {
      const i = counters[mealType] ?? 0
      meals.push(buildMockMeal(day, mealType, i))
      counters[mealType] = i + 1
    }
  }

  return meals
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRemainingWeekDays(planStartDate: string): string[] {
  const date = new Date(planStartDate + 'T00:00:00')
  const dow = date.getDay() // 0=Sun, 1=Mon…6=Sat
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (dow === 0) return weekDays // Sunday → full Mon–Sun window
  return weekDays.slice(dow - 1) // Mon=slice(0)…Sat=slice(5)→['Sat','Sun']
}

function getWeekStartDate(planStartDate: string): string {
  const date = new Date(planStartDate + 'T00:00:00')
  const dow = date.getDay()
  if (dow === 0) {
    const monday = new Date(date)
    monday.setDate(date.getDate() + 1)
    return monday.toISOString().split('T')[0]
  }
  const monday = new Date(date)
  monday.setDate(date.getDate() - (dow - 1))
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

function isPrepAheadV2(pa: unknown): pa is PrepAheadV2 {
  return (
    typeof pa === 'object' &&
    pa !== null &&
    !Array.isArray(pa) &&
    typeof (pa as PrepAheadV2).tonight === 'string' &&
    typeof (pa as PrepAheadV2).tomorrow === 'string'
  )
}

function buildCandidateBlock(
  candidatesPerType: Record<string, BankRecipe[]>,
  mealTypesNeeded: string[]
): string {
  const sections: string[] = []

  for (const mtype of mealTypesNeeded) {
    const candidates = candidatesPerType[mtype] ?? []
    if (candidates.length === 0) continue
    const lines = [`[${mtype} candidates]`]
    for (const r of candidates) {
      let description: string
      if (r.source === 'user_imported' && r.raw_text) {
        description = r.raw_text.slice(0, 300)
      } else if (Array.isArray(r.steps_v2)) {
        description = (r.steps_v2 as { instruction?: string }[])
          .slice(0, 3)
          .map(s => s.instruction)
          .filter(Boolean)
          .join(' → ') || 'no description available'
      } else {
        description = 'no description available'
      }
      const label = r.source === 'user_imported' ? 'yours' : 'ai-generated'
      lines.push(`- "${r.name}" (${label}): ${description} [bank_recipe_id: ${r.id}]`)
    }
    sections.push(lines.join('\n'))
  }

  if (sections.length === 0) return ''

  return [
    'RECIPE BANK (use these first):',
    sections.join('\n\n'),
    '',
    'BANK USAGE RULES:',
    '- If a meal type has ≥ 2 bank candidates: use ONLY bank recipes for that meal type.',
    '- If a meal type has < 2 bank candidates: use all available bank recipes first, then generate new ones to fill remaining slots.',
    '- When selecting a bank recipe, copy its name exactly and set bank_recipe_id to the ID shown in brackets.',
    '- When generating a new recipe, omit bank_recipe_id or set it to null.',
  ].join('\n')
}

// Incrementally extract complete MealOutput objects from a growing JSON string.
// cursor = -1 on first call; pass back result.cursor on subsequent calls.
function extractNextMeals(text: string, cursor: number): { meals: MealOutput[]; cursor: number } {
  const meals: MealOutput[] = []
  let pos = cursor

  if (pos < 0) {
    const keyIdx = text.indexOf('"meals"')
    if (keyIdx === -1) return { meals, cursor: -1 }
    const arrIdx = text.indexOf('[', keyIdx)
    if (arrIdx === -1) return { meals, cursor: -1 }
    pos = arrIdx + 1
  }

  while (true) {
    while (pos < text.length && ' \t\n\r,'.includes(text[pos])) pos++
    if (pos >= text.length || text[pos] !== '{') break

    const start = pos
    let depth = 0
    let inStr = false
    let esc = false
    let end = -1

    for (let j = start; j < text.length; j++) {
      const ch = text[j]
      if (esc) { esc = false; continue }
      if (ch === '\\' && inStr) { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') { if (--depth === 0) { end = j; break } }
    }

    if (end === -1) { pos = start; break }

    try {
      meals.push(JSON.parse(text.slice(start, end + 1)) as MealOutput)
      pos = end + 1
    } catch {
      pos = start
      break
    }
  }

  return { meals, cursor: pos }
}

// ── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean
  issues: string[]
}

function validatePlan(
  meals: MealOutput[],
  prepAheadTypes: Set<string>,
  useSoon: string | undefined
): ValidationResult {
  const issues: string[] = []
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // 1. Prep-ahead structure check
  for (const m of meals) {
    if (prepAheadTypes.has(m.meal_type)) {
      if (!isPrepAheadV2(m.recipe.prep_ahead)) {
        issues.push(
          `${m.meal_type} meal "${m.recipe_name}" is missing prep_ahead.tonight and prep_ahead.tomorrow. Both fields are required for ${m.meal_type} recipes.`
        )
      }
    }
  }

  // 2. Use-soon items in first 2 day-slots
  if (useSoon && useSoon.trim()) {
    const sorted = [...meals].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
    const uniqueDays = Array.from(new Set(sorted.map(m => m.day)))
    const first2Days = new Set(uniqueDays.slice(0, 2))
    const first2Meals = meals.filter(m => first2Days.has(m.day))
    const keyword = useSoon.split(',')[0].trim().toLowerCase()
    const found = first2Meals.some(
      m =>
        m.use_soon_priority ||
        m.reasoning.toLowerCase().includes(keyword) ||
        m.recipe_name.toLowerCase().includes(keyword)
    )
    if (!found) {
      issues.push(
        `Use-soon item "${useSoon}" must appear in a meal in the first 2 days of the plan. Assign at least one meal using this ingredient to the earliest available day slot.`
      )
    }
  }

  // 3. No same protein on consecutive days
  const sortedMeals = [...meals].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
  for (let i = 0; i < sortedMeals.length - 1; i++) {
    const curr = sortedMeals[i]
    const next = sortedMeals[i + 1]
    if (
      curr.protein_source &&
      next.protein_source &&
      curr.protein_source.toLowerCase() === next.protein_source.toLowerCase() &&
      dayOrder.indexOf(next.day) === dayOrder.indexOf(curr.day) + 1
    ) {
      issues.push(
        `Same protein (${curr.protein_source}) on consecutive days ${curr.day} and ${next.day}. Change one of these meals to use a different protein source.`
      )
    }
  }

  // 4. No same carb base 3+ times
  const carbCounts: Record<string, number> = {}
  for (const m of meals) {
    if (m.carb_base) {
      const carb = m.carb_base.toLowerCase()
      carbCounts[carb] = (carbCounts[carb] ?? 0) + 1
    }
  }
  for (const [carb, count] of Object.entries(carbCounts)) {
    if (count >= 3) {
      issues.push(
        `"${carb}" is the carb base in ${count} meals. Reduce to at most 2 meals with this carb base.`
      )
    }
  }

  return { valid: issues.length === 0, issues }
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

  const { anon_id, pantry_input, week_context, use_soon, plan_start_date, meal_plan, day_selections } = body as {
    anon_id: string
    pantry_input: string
    week_context?: string
    use_soon?: string
    plan_start_date?: string
    meal_plan?: Record<string, number>
    day_selections?: Record<string, string[]>
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
  const rawDietaryRules: string | null = prefs?.dietary_rules ?? null
  const flagsText = (prefs?.dietary_flags as string[] ?? [])
    .map(f => {
      if (f === 'no_red_meat') return 'no beef, lamb, pork, venison, or red meat'
      if (f === 'no_raw_fish') return 'no sushi, sashimi, ceviche, or raw fish preparations'
      return f.replace('_', '-')
    })
    .join('; ')
  const dietaryRules: string | null = [rawDietaryRules, flagsText].filter(Boolean).join('; ') || null
  const bannedIngredients: string | null = prefs?.banned_ingredients ?? null
  const skill: string | null = prefs?.skill_level ?? null
  const budget: string | null = prefs?.weeknight_budget ?? null
  const rawMealPrefs: Record<string, { prep_ahead: boolean; max_assembly_mins?: number }> =
    (prefs?.meal_prefs as Record<string, { prep_ahead: boolean; max_assembly_mins?: number }>) ??
    { breakfast: { prep_ahead: true, max_assembly_mins: 30 }, dinner: { prep_ahead: false } }
  const mealPrefs: Record<string, { prep_ahead: boolean; max_assembly_mins?: number }> = { ...rawMealPrefs }
  if (rawMealPrefs['brunch'] && !rawMealPrefs['breakfast']) {
    mealPrefs['breakfast'] = rawMealPrefs['brunch']
  }
  const healthGoals: string = (prefs?.health_goals as string) ?? 'high protein, balanced'

  // 2. Compute rolling planning window
  const startDate = (typeof plan_start_date === 'string' && plan_start_date)
    ? plan_start_date
    : new Date().toISOString().split('T')[0]
  const remainingDays = getRemainingWeekDays(startDate)
  const weekStartDate = getWeekStartDate(startDate)

  // 3. Resolve meal_plan — fall back to user defaults; normalize 'brunch' → 'breakfast'
  const rawMealPlan: Record<string, number> =
    meal_plan ??
    (prefs?.meal_days_default as Record<string, number>) ??
    { breakfast: 5, dinner: 2 }
  const effectiveMealPlan: Record<string, number> = {}
  for (const [k, v] of Object.entries(rawMealPlan)) {
    const key = k === 'brunch' ? 'breakfast' : k
    effectiveMealPlan[key] = (effectiveMealPlan[key] ?? 0) + v
  }

  // 4. Fetch recipe bank — build candidate list per meal type (FEAT-003)
  const mealTypesNeeded = Object.entries(effectiveMealPlan)
    .filter(([, count]) => count > 0)
    .map(([type]) => type)

  const { data: bankRecipeRows } = await admin
    .from('recipes')
    .select('id, name, meal_type, source, raw_text, steps_v2')
    .eq('anon_id', anon_id)
    .eq('excluded_from_plans', false)
    .in('recipe_type', ['main', 'complete_meal'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const bankRecipes = (bankRecipeRows ?? []) as BankRecipe[]
  const bankRecipeIdSet = new Set(bankRecipes.map(r => r.id))
  const candidatesPerType: Record<string, BankRecipe[]> = {}
  for (const mtype of mealTypesNeeded) {
    candidatesPerType[mtype] = bankRecipes.filter(
      r => !r.meal_type || r.meal_type === mtype || r.meal_type === 'any' ||
        (mtype === 'breakfast' && r.meal_type === 'brunch')
    )
  }
  const candidateBlock = buildCandidateBlock(candidatesPerType, mealTypesNeeded)

  // 5. Determine which meal types require prep_ahead
  const prepAheadTypes = new Set<string>(
    Object.entries(mealPrefs)
      .filter(([, v]) => v.prep_ahead)
      .map(([k]) => k)
  )

  // 6. Build slot schedule instructions
  const mealTypeSlotsInfo: string[] = []
  const breakfastCount = effectiveMealPlan['breakfast'] ?? 0
  const dinnerCount = effectiveMealPlan['dinner'] ?? 0

  if (breakfastCount > 0) {
    const assigned = day_selections?.['breakfast'] ?? remainingDays.slice(0, Math.min(breakfastCount, remainingDays.length))
    mealTypeSlotsInfo.push(
      `BREAKFAST (${assigned.length} slots): assign to exactly these days in order: ${assigned.join(', ')}.`
    )
  }
  if (dinnerCount > 0) {
    const dinnerDays = day_selections?.['dinner'] ?? remainingDays
    mealTypeSlotsInfo.push(
      `DINNER (${dinnerCount} slots): choose ${dinnerCount} day(s) from [${dinnerDays.join(', ')}] based on week context. Busy days → simpler meals (≤30 min total). Occasion days → more involved.`
    )
  }
  for (const [mtype, count] of Object.entries(effectiveMealPlan)) {
    if (mtype !== 'breakfast' && mtype !== 'dinner' && count > 0) {
      const days = day_selections?.[mtype] ?? remainingDays
      mealTypeSlotsInfo.push(
        `${mtype.toUpperCase()} (${count} slots): distribute across days [${days.join(', ')}].`
      )
    }
  }

  // 7. Build prompt blocks
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
    ? `USE-SOON PRIORITY: The user has these items that must be used this week: "${use_soon}". Assign meals using them to the first 2 days of the plan. The reasoning for those meals must explicitly name the ingredient.`
    : ''

  const weekContextBlock = week_context
    ? `WEEK CONTEXT: "${week_context}". Parse for busy days (cook time ≤25 min) and occasion days (go all-out).`
    : ''

  const prepAheadInstructions: string[] = Array.from(prepAheadTypes).map(mtype => {
    const mt = mealPrefs[mtype]
    const maxMins = mt?.max_assembly_mins ?? 30
    return `For every ${mtype} recipe, prep_ahead MUST be an object {"tonight": "...", "tomorrow": "..."} — "tonight" is what to prep the evening before (with time estimate), "tomorrow" is what to assemble at meal time (target ≤${maxMins} min). Never output a ${mtype} recipe without both fields.`
  })

  const totalSlots = Object.values(effectiveMealPlan).reduce((s, n) => s + n, 0)

  const systemPrompt = `You are a warm, knowledgeable meal planning assistant. You create practical, delicious weekly meal plans tailored to the household. You always respond with valid JSON only — no markdown, no explanation, just the JSON object.

PROTEIN-FIRST: For each meal slot, choose the protein source first based on what's in the pantry and the user's health goals. Then select carbohydrates and vegetables that complement that protein. Do not assign a meal and then reverse-engineer the protein.

HEALTH GOAL (hard constraint): ${healthGoals}. This is not optional — every meal must meet this constraint. For "high protein, balanced": every meal must include a clear protein source (meat, eggs, legumes, paneer, or tofu). Low-protein fillers (toast, plain rice, salads without protein) are not acceptable as standalone meals.

Do not combine ingredients or techniques from different culinary traditions within a single dish unless the user has explicitly asked for fusion in their week context. A dish may be Indian or Italian or Mexican — not all three. When in doubt, keep the dish within one cuisine.

Pantry items without quantities: treat proteins and fresh vegetables as available for one meal only unless the user specifies a quantity. Pantry staples — spices, oils, canned goods, dry grains — are assumed abundant and may appear in multiple meals.
`

  const userPrompt = `Generate a meal plan with ${totalSlots} total meals for the week starting ${startDate}.

HOUSEHOLD:
- ${whoForDescription(whoFor, servings)}
- Skill: ${skillLabel(skill)}
- Time budget: ${timeBudgetLabel(budget)}
- ${dietBlock}
${bannedBlock ? `- ${bannedBlock}` : ''}
- ${cuisineBlock}
${useSoonBlock ? `\n${useSoonBlock}` : ''}${weekContextBlock ? `\n${weekContextBlock}` : ''}

MEAL SLOTS TO GENERATE:
${mealTypeSlotsInfo.join('\n')}
${candidateBlock ? `\n${candidateBlock}\n` : ''}
WHAT THEY HAVE IN THE KITCHEN:
${pantry_input}

RULES:
1. Every meal is a COMPLETE MEAL — protein + carb + vegetables. No separate sides needed.
2. No back-to-back meals using the same main protein across consecutive days.
3. No carbohydrate base repeated more than twice across the full plan.
4. Vary effort: lighter/quicker weekdays, more ambitious Friday–Saturday.
5. Weeknight cook times must respect the time budget above.
6. ${prepAheadInstructions.length > 0 ? prepAheadInstructions.join(' ') : 'Each recipe may include prep_ahead as an array of {task, time_sensitive} objects if the recipe benefits from advance prep.'}
7. Reasoning is one casual, direct sentence — no "This dish provides…" openings. Write like a friend.
8. Include 5–8 steps_v2 per recipe. Add tip callouts only where genuinely useful.
9. protein_source: short label like "eggs", "paneer", "chicken", "moong dal".
10. carb_base: short label like "rice", "roti", "bread", "oats".

TIP TYPES (optional, only when it adds real value):
- TIMING: warn about steps that take longer than expected
- DONENESS: how to know it's actually ready
- HEADS_UP: something that trips people up
- CLEAN: a clean-as-you-go moment that saves hassle

Respond with ONLY this JSON structure:
{
  "meals": [
    {
      "day": "Mon",
      "meal_type": "breakfast",
      "recipe_name": "string",
      "reasoning": "string",
      "use_soon_priority": false,
      "protein_source": "eggs",
      "carb_base": "roti",
      "bank_recipe_id": null,
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
        "prep_ahead": { "tonight": "string", "tomorrow": "string" },
        "prep_friendly": true,
        "assembly_time_mins": 20,
        "is_complete_meal": true
      }
    }
  ]
}`

  // 7. Stream tokens from Claude, emit meals as they're parsed, then save to DB
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      try {
        let streamedMeals: MealOutput[] = []
        let accumulated = ''

        if (process.env.MOCK_AI === 'true') {
          // Mock mode — stream fake meals with delays, no Anthropic call
          const mockMeals = buildMockMeals(day_selections ?? {})
          for (const meal of mockMeals) {
            await new Promise(r => setTimeout(r, 700))
            send({ type: 'meal', meal })
            streamedMeals.push(meal)
          }
        } else {
          // First generation pass
          const claudeStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          })

          let cursor = -1

          for await (const event of claudeStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              accumulated += event.delta.text
              const result = extractNextMeals(accumulated, cursor)
              cursor = result.cursor
              for (const meal of result.meals) {
                send({ type: 'meal', meal })
                streamedMeals.push(meal)
              }
            }
          }
        }

        if (streamedMeals.length === 0) {
          send({ type: 'error', message: "Couldn't build your week. Give it one more try?" })
          controller.close()
          return
        }

        // 8. Post-generation validation (skipped in mock mode)
        const validation = process.env.MOCK_AI === 'true'
          ? { valid: true, issues: [] }
          : validatePlan(streamedMeals, prepAheadTypes, use_soon)

        if (!validation.valid) {
          const fixPrompt = `The plan you generated has the following issues. Fix ONLY these issues, keep everything else the same, and return the complete corrected plan in the same JSON format:

${validation.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Return the complete corrected JSON with all meals.`

          const fixResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: accumulated },
              { role: 'user', content: fixPrompt },
            ],
          })

          const fixText =
            fixResponse.content[0]?.type === 'text' ? fixResponse.content[0].text : ''
          const fixResult = extractNextMeals(fixText, -1)
          if (fixResult.meals.length > 0) {
            streamedMeals = fixResult.meals
          }
        }

        // 9. Persist recipes — bank recipes referenced by ID; new AI recipes saved
        const recipeIdMap: Record<string, string> = {}

        for (const mealOut of streamedMeals) {
          const recipeName = mealOut.recipe?.name ?? mealOut.recipe_name
          const mealType = (mealOut.meal_type ?? 'dinner') as string

          // Bank recipe selected by AI — use existing ID, do not re-save
          // Validate against the known set to guard against hallucinated IDs
          if (mealOut.bank_recipe_id && bankRecipeIdSet.has(mealOut.bank_recipe_id)) {
            recipeIdMap[recipeName] = mealOut.bank_recipe_id
            continue
          }

          const r = mealOut.recipe
          const isPrep = isPrepAheadV2(r.prep_ahead)

          // Check if a recipe with this name already exists for this user
          const { data: existing } = await admin
            .from('recipes')
            .select('id')
            .eq('name', recipeName)
            .eq('anon_id', anon_id)
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
                source: 'ai_generated',
                source_type: 'ai_generated',
                meal_type: (mealType as string) === 'brunch' ? 'breakfast' : mealType,
                prep_friendly: isPrep,
                assembly_time_mins: r.assembly_time_mins ?? null,
              })
              .eq('id', existing.id)
            recipeIdMap[recipeName] = existing.id
          } else {
            const { data: inserted } = await admin
              .from('recipes')
              .insert({
                anon_id,
                user_id: null,
                name: recipeName,
                cuisine_type: r.cuisine_type,
                meal_type: (mealType as string) === 'brunch' ? 'breakfast' : mealType,
                cook_time_minutes: r.cook_time_minutes,
                servings: r.servings,
                ingredients: r.ingredients,
                steps: [],
                steps_v2: r.steps_v2,
                prep_ahead: r.prep_ahead,
                is_complete_meal: true,
                batch_cookable: false,
                source: 'ai_generated',
                source_type: 'ai_generated',
                prep_friendly: isPrep,
                assembly_time_mins: r.assembly_time_mins ?? null,
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

        // 10. Build slots array
        const slotsArray: PlanSlot[] = streamedMeals.map(m => ({
          day: m.day,
          meal_type: ((m.meal_type as string) === 'brunch' ? 'breakfast' : (m.meal_type ?? 'dinner')) as PlanSlot['meal_type'],
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

        // 11. Create or update week_plans row (preserve cooked meals on re-generate)
        const { data: existingPlan } = await admin
          .from('week_plans')
          .select('id')
          .eq('anon_id', anon_id)
          .eq('week_start_date', weekStartDate)
          .maybeSingle()

        let weekPlanId: string
        let mealsToInsert = streamedMeals

        if (existingPlan?.id) {
          const { data: cookedMeals } = await admin
            .from('meals')
            .select('day')
            .eq('week_plan_id', existingPlan.id)
            .eq('cooked', true)

          const cookedDays = new Set((cookedMeals ?? []).map((m: { day: string }) => m.day))

          await admin
            .from('meals')
            .delete()
            .eq('week_plan_id', existingPlan.id)
            .eq('cooked', false)

          const { error: updateError } = await admin
            .from('week_plans')
            .update({
              slots: generatedPlan,
              pantry_snapshot: pantry_input,
              week_context: week_context ?? null,
              use_soon_text: use_soon ?? null,
            })
            .eq('id', existingPlan.id)

          if (updateError) {
            send({ type: 'error', message: "Couldn't build your week. Give it one more try?" })
            controller.close()
            return
          }

          weekPlanId = existingPlan.id
          mealsToInsert = streamedMeals.filter(m => !cookedDays.has(m.day))
        } else {
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
            send({ type: 'error', message: "Couldn't build your week. Give it one more try?" })
            controller.close()
            return
          }

          weekPlanId = weekPlan.id
        }

        // 12. Create meals rows
        const mealRows = mealsToInsert.map(m => ({
          week_plan_id: weekPlanId,
          day: m.day,
          meal_type: m.meal_type ?? 'dinner',
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

        let insertedMeals: Record<string, unknown>[] = []

        if (mealRows.length > 0) {
          const { data: newMeals, error: mealsError } = await admin
            .from('meals')
            .insert(mealRows)
            .select('*')

          if (mealsError) {
            send({ type: 'error', message: "Couldn't build your week. Give it one more try?" })
            controller.close()
            return
          }

          insertedMeals = newMeals ?? []
        }

        // 13. Persist pantry snapshot to preferences
        await admin
          .from('user_preferences')
          .upsert({ anon_id, last_pantry_input: pantry_input }, { onConflict: 'anon_id' })

        send({ type: 'done', week_plan_id: weekPlanId, meals: insertedMeals, recipe_ids: recipeIdMap })
      } catch {
        send({ type: 'error', message: "Couldn't build your week. Give it one more try?" })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
