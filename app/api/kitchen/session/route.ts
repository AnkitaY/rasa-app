import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { PlanSlot, GeneratedKitchenSession } from '@/lib/types'

const anthropic = new Anthropic()

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function POST() {
  try {
    const admin = createAdminClient()
    const anon = createClient()
    const { data: { user } } = await anon.auth.getUser()

    // Latest week plan
    const { data: weekPlan, error: planError } = await admin
      .from('week_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (planError || !weekPlan) {
      return NextResponse.json({ error: 'No week plan found. Generate a plan first.' }, { status: 400 })
    }

    const stored = weekPlan.slots as { slots: PlanSlot[] }
    const slots: PlanSlot[] = stored.slots ?? []

    // Determine today and tomorrow day names
    const now = new Date()
    const todayName = DAYS[now.getDay()]
    const tomorrowName = DAYS[(now.getDay() + 1) % 7]

    const dinnerSlot = slots.find((s) => s.day === todayName && s.meal_type === 'dinner' && !s.eating_out)
    const brunchSlot = slots.find((s) => s.day === tomorrowName && (s.meal_type === 'brunch' || s.meal_type === 'breakfast') && !s.eating_out)

    if (!dinnerSlot?.recipe_id && !brunchSlot?.recipe_id) {
      return NextResponse.json({ error: 'No recipes found for tonight or tomorrow breakfast.' }, { status: 400 })
    }

    // Fetch full recipe details
    const recipeIds = [dinnerSlot?.recipe_id, brunchSlot?.recipe_id].filter(Boolean) as string[]
    const { data: recipes, error: recipeError } = await admin
      .from('recipes')
      .select('id, name, cook_time_minutes, ingredients, steps, macros_per_serving')
      .in('id', recipeIds)

    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })

    const recipeMap = Object.fromEntries((recipes ?? []).map((r) => [r.id, r]))
    const dinnerRecipe = dinnerSlot?.recipe_id ? recipeMap[dinnerSlot.recipe_id] : null
    const brunchRecipe = brunchSlot?.recipe_id ? recipeMap[brunchSlot.recipe_id] : null

    // Fetch inventory
    const invQuery = admin.from('inventory_items').select('name, quantity, unit, location')
    const { data: inventory } = await (
      user?.id
        ? invQuery.or(`user_id.eq.${user.id},user_id.is.null`)
        : invQuery.is('user_id', null)
    )

    const inventoryList = (inventory ?? [])
      .map((i) => `${i.name}${i.quantity ? ` (${i.quantity}${i.unit ? ' ' + i.unit : ''})` : ''} — ${i.location}`)
      .join('\n')

    // Build Claude prompt
    const dinnerContext = dinnerRecipe
      ? `TONIGHT'S DINNER: ${dinnerRecipe.name}\nCook time: ${dinnerRecipe.cook_time_minutes ?? '?'} min\nIngredients: ${JSON.stringify(dinnerRecipe.ingredients)}\nSteps: ${(dinnerRecipe.steps as string[]).map((s, i) => `${i + 1}. ${s}`).join(' ')}`
      : 'No dinner recipe tonight (eating out or unplanned).'

    const brunchContext = brunchRecipe
      ? `TOMORROW'S BRUNCH: ${brunchRecipe.name}\nCook time: ${brunchRecipe.cook_time_minutes ?? '?'} min\nIngredients: ${JSON.stringify(brunchRecipe.ingredients)}\nSteps: ${(brunchRecipe.steps as string[]).map((s, i) => `${i + 1}. ${s}`).join(' ')}`
      : 'No brunch recipe tomorrow (eating out or unplanned).'

    const prompt = `You are a kitchen prep assistant. Analyze tomorrow's brunch recipe and identify every component that can be prepared tonight in parallel with cooking dinner.

${dinnerContext}

${brunchContext}

CURRENT INVENTORY:
${inventoryList || 'No inventory data available.'}

Classify each prep task:
- passive_prep: marinating, thawing, soaking — no active attention needed
- quick_prep: 2-5 min active work — chopping, mixing spice blends, measuring
- cook_ahead: full component cooked now, reheated tomorrow
- finish_only: less than 5 min needed tomorrow — skip tonight, do in morning

Specify when during dinner cooking each prep task can run in parallel (e.g. "while onions caramelise", "while rice cooks").
Identify batch opportunities for other meals this week.

Return ONLY valid JSON (no markdown, no explanation):
{
  "session_duration_minutes": <total active kitchen time tonight>,
  "prep_tasks": [
    {
      "task_type": "passive_prep" | "quick_prep" | "cook_ahead" | "finish_only",
      "description": "<clear action>",
      "duration_minutes": <number>,
      "parallel_with": "<dinner step to do this alongside>"
    }
  ],
  "tomorrow_finish_steps": ["<step 1>", "<step 2>"],
  "batch_opportunities": [
    {
      "description": "<what to make extra of>",
      "extra_time_minutes": <number>,
      "saves_future_meal": "<which future meal this helps>"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Claude returned invalid JSON.' }, { status: 500 })
    }

    const generated: GeneratedKitchenSession = JSON.parse(jsonMatch[0])

    // Save session
    const { data: saved, error: saveError } = await admin
      .from('cooking_sessions')
      .insert({
        user_id: user?.id ?? null,
        week_plan_id: weekPlan.id,
        session_date: now.toISOString().split('T')[0],
        dinner_recipe_id: dinnerSlot?.recipe_id ?? null,
        dinner_recipe_name: dinnerRecipe?.name ?? dinnerSlot?.recipe_name ?? null,
        brunch_recipe_id: brunchSlot?.recipe_id ?? null,
        brunch_recipe_name: brunchRecipe?.name ?? brunchSlot?.recipe_name ?? null,
        session_duration_minutes: generated.session_duration_minutes,
        prep_tasks: generated.prep_tasks,
        tomorrow_finish_steps: generated.tomorrow_finish_steps,
        batch_opportunities: generated.batch_opportunities,
      })
      .select()
      .single()

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    return NextResponse.json({ session: saved }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = createAdminClient()
    const anon = createClient()
    const { data: { user } } = await anon.auth.getUser()

    const today = new Date().toISOString().split('T')[0]

    const query = admin
      .from('cooking_sessions')
      .select('*')
      .eq('session_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await (
      user?.id
        ? admin.from('cooking_sessions').select('*').eq('session_date', today).or(`user_id.eq.${user.id},user_id.is.null`).order('created_at', { ascending: false }).limit(1).maybeSingle()
        : query
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session: data ?? null })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const admin = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: session } = await admin
      .from('cooking_sessions')
      .select('id')
      .eq('session_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'No session for today.' }, { status: 404 })

    const { error } = await admin
      .from('cooking_sessions')
      .update({ brunch_done: true })
      .eq('id', session.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
