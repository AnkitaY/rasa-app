import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic()

/**
 * POST /api/recipes/import
 * Body: { url: string }
 * Fetches the page at the URL, asks Claude to structure it as a recipe,
 * saves to DB, and returns the saved recipe id.
 */
export async function POST(request: NextRequest) {
  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { url } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required.' }, { status: 400 })
  }

  // Fetch the page content
  let pageText: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RasaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    // Strip tags to reduce token usage — keep text content only
    pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 12000) // cap to avoid huge prompts
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach that URL. Check the link and try again?" },
      { status: 400 }
    )
  }

  const prompt = `Extract the recipe from this web page text and return it as structured JSON.

PAGE TEXT:
${pageText}

SOURCE URL: ${url}

Return ONLY valid JSON with no markdown:
{
  "name": "string",
  "cuisine_type": "string",
  "meal_type": "dinner",
  "cook_time_minutes": 30,
  "servings": 2,
  "is_complete_meal": true,
  "ingredients": [
    { "name": "string", "quantity": 1, "unit": "string" }
  ],
  "steps_v2": [
    {
      "instruction": "string",
      "tip_type": "TIMING",
      "tip_text": "string"
    }
  ],
  "prep_ahead": [
    { "task": "string", "time_sensitive": false }
  ]
}

Rules:
- steps_v2: add tip callouts only where genuinely useful (TIMING / DONENESS / HEADS_UP / CLEAN)
- tip_type and tip_text are optional — omit if not useful
- prep_ahead: list any "do ahead" or advance prep steps from the recipe
- is_complete_meal: true if the recipe includes protein + carb + veg all-in-one, false if it's a component
- If the page contains no recipe, return { "error": "No recipe found" }`

  let aiText: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    aiText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch {
    return NextResponse.json(
      { error: "Couldn't structure the recipe. Give it one more try?" },
      { status: 500 }
    )
  }

  let parsed: Record<string, unknown>
  try {
    const match = aiText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    parsed = JSON.parse(match[0])
    if (parsed.error) {
      return NextResponse.json({ error: String(parsed.error) }, { status: 422 })
    }
    if (!parsed.name) throw new Error('No name')
  } catch {
    return NextResponse.json(
      { error: "Couldn't structure the recipe. Give it one more try?" },
      { status: 500 }
    )
  }

  // Save to DB
  const admin = createAdminClient()
  const { data: saved, error: dbError } = await admin
    .from('recipes')
    .insert({
      user_id: null,
      name: parsed.name,
      cuisine_type: parsed.cuisine_type ?? null,
      meal_type: parsed.meal_type ?? 'dinner',
      cook_time_minutes: parsed.cook_time_minutes ?? null,
      servings: parsed.servings ?? 2,
      ingredients: parsed.ingredients ?? [],
      steps: [],
      steps_v2: parsed.steps_v2 ?? [],
      prep_ahead: parsed.prep_ahead ?? [],
      is_complete_meal: parsed.is_complete_meal ?? false,
      batch_cookable: false,
      source_type: 'url_import',
      source_url: url,
      source_raw_text: null,
      macros_per_serving: null,
      user_rating: null,
      last_cooked_date: null,
    })
    .select('id, name')
    .single()

  if (dbError) {
    return NextResponse.json(
      { error: "Couldn't save the recipe. Give it one more try?" },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, recipe: saved })
}
