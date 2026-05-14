import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic()

const VALID_RECIPE_TYPES = ['main', 'side', 'salad', 'complete_meal'] as const
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'any'] as const

type RecipeType = typeof VALID_RECIPE_TYPES[number]
type MealType = typeof VALID_MEAL_TYPES[number]

interface ParsedRecipe {
  ingredients: { name: string; quantity: number | string; unit: string }[]
  steps_v2: { instruction: string }[]
  cook_time_minutes: number | null
  servings: number | null
  cuisine_type: string | null
}

async function parseRecipeWithAI(name: string, raw_text: string): Promise<ParsedRecipe> {
  if (process.env.MOCK_AI === 'true') {
    return {
      ingredients: [
        { name: 'Toor dal', quantity: 1, unit: 'cup' },
        { name: 'Whole wheat flour dough', quantity: 2, unit: 'cups' },
        { name: 'Tomatoes', quantity: 2, unit: 'medium' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Cumin seeds', quantity: 1, unit: 'tsp' },
        { name: 'Turmeric', quantity: 0.5, unit: 'tsp' },
        { name: 'Salt', quantity: 1, unit: 'tsp' },
        { name: 'Oil', quantity: 2, unit: 'tbsp' },
      ],
      steps_v2: [
        { instruction: 'Cook toor dal with turmeric and salt until soft and mushy.' },
        { instruction: 'Roll out the dough into thin sheets and cut into diamond shapes (dhoklis).' },
        { instruction: 'Heat oil in a pot, add cumin seeds and let them splutter.' },
        { instruction: 'Add onions and tomatoes, cook until softened into a sauce.' },
        { instruction: 'Add the cooked dal to the pot and bring to a simmer.' },
        { instruction: 'Drop the dhoklis into the simmering dal and cook for 10–12 minutes until they are cooked through.' },
        { instruction: 'Serve hot, garnished with fresh coriander.' },
      ],
      cook_time_minutes: 45,
      servings: 4,
      cuisine_type: 'Indian',
    }
  }

  const prompt = `You are parsing a recipe. Extract structured data from the text below.

Recipe name: ${name}

Recipe text:
${raw_text}

Return ONLY valid JSON, no markdown:
{
  "ingredients": [{ "name": "string", "quantity": 1, "unit": "string" }],
  "steps_v2": [{ "instruction": "string" }],
  "cook_time_minutes": 30,
  "servings": 4,
  "cuisine_type": "string or null"
}

Rules:
- quantity must be a number (use 0 if unknown)
- unit can be empty string if no unit
- steps_v2 must be individual cooking actions, one per step
- cook_time_minutes: total active+passive cook time in minutes, null if unknown
- servings: null if not mentioned
- cuisine_type: null if unclear`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in AI response')
  return JSON.parse(match[0]) as ParsedRecipe
}

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

  let parsed: ParsedRecipe
  try {
    parsed = await parseRecipeWithAI(name as string, raw_text as string)
  } catch {
    parsed = { ingredients: [], steps_v2: [], cook_time_minutes: null, servings: null, cuisine_type: null }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recipes')
    .insert({
      anon_id,
      user_id: null,
      name: (name as string).slice(0, 120),
      raw_text,
      recipe_type,
      meal_type: mealTypeValue,
      source: 'user_imported',
      source_type: 'user_imported',
      source_url:
        source_url && typeof source_url === 'string' ? source_url.slice(0, 500) : null,
      ingredients: parsed.ingredients,
      steps: [],
      steps_v2: parsed.steps_v2,
      cook_time_minutes: parsed.cook_time_minutes,
      servings: parsed.servings,
      cuisine_type: parsed.cuisine_type,
      is_complete_meal: recipe_type === 'complete_meal',
    })
    .select('id, name, recipe_type, meal_type, source')
    .single()

  if (error) {
    console.error('[recipes/import] DB error', error)
    return NextResponse.json({ error: 'Could not save recipe', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ recipe: data })
}
