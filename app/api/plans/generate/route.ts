import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GeneratedPlan } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a meal planning AI for a 2-person household.
Constraints: 70g protein/day, max 80g carbs/day,
brunch + dinner only, North Indian/Mexican/fusion cuisines.
Rules: select from provided recipes, meet protein target,
minimize unique ingredients, find batch cook opportunities,
prioritize use_soon inventory items, no recipe repeated within 5 days.
Return 7-day plan as JSON: {slots:[{day,meal_type,recipe_id,
recipe_name,protein_g,carbs_g}], daily_totals:[{day,total_protein,
total_carbs,target_met}], batch_opportunities:[{description}]}`

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const lockedSlots: Array<{ day: string; meal_type: string }> = body.locked_slots ?? []

    const adminClient = createAdminClient()
    const anonClient = createClient()
    const { data: { user } } = await anonClient.auth.getUser()

    // Fetch recipes — when unauthenticated only pull null user_id rows
    const recipesQuery = adminClient
      .from('recipes')
      .select('id, name, cuisine_type, meal_type, servings, macros_per_serving, batch_cookable, ingredients')

    const { data: recipes, error: recipeError } = await (
      user?.id
        ? recipesQuery.or(`user_id.eq.${user.id},user_id.is.null`)
        : recipesQuery.is('user_id', null)
    )

    if (recipeError) {
      return NextResponse.json({ error: recipeError.message }, { status: 500 })
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json(
        { error: 'No recipes found. Add some recipes to your recipe bank first.' },
        { status: 400 }
      )
    }

    // Fetch use_soon inventory
    const inventoryQuery = adminClient
      .from('inventory_items')
      .select('name, quantity, unit')
      .eq('use_soon', true)

    const { data: inventory } = await (
      user?.id
        ? inventoryQuery.or(`user_id.eq.${user.id},user_id.is.null`)
        : inventoryQuery.is('user_id', null)
    )

    const recipeList = recipes.map((r) => ({
      id: r.id,
      name: r.name,
      cuisine_type: r.cuisine_type,
      meal_type: r.meal_type,
      protein_g: (r.macros_per_serving as { protein_g?: number } | null)?.protein_g ?? 0,
      carbs_g: (r.macros_per_serving as { carbs_g?: number } | null)?.carbs_g ?? 0,
      batch_cookable: r.batch_cookable,
    }))

    const useSoonItems = (inventory ?? []).map((i) => `${i.name} (${i.quantity} ${i.unit})`)

    const userMessage = `
Available recipes:
${JSON.stringify(recipeList, null, 2)}

Use-soon inventory items: ${useSoonItems.length > 0 ? useSoonItems.join(', ') : 'none'}

Locked slots (do not change these): ${lockedSlots.length > 0 ? JSON.stringify(lockedSlots) : 'none'}

Days to plan: ${DAYS.join(', ')}
Meal types: brunch, dinner

Generate the full 7-day plan now.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let plan: GeneratedPlan
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      plan = JSON.parse(jsonMatch[0]) as GeneratedPlan
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse plan from AI response', raw: rawText },
        { status: 500 }
      )
    }

    // Compute week_start_date (most recent Monday)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    const weekStartDate = monday.toISOString().split('T')[0]

    const planToSave = {
      user_id: user?.id ?? null,
      week_start_date: weekStartDate,
      slots: plan,
    }

    const { data: savedPlan, error: dbError } = await adminClient
      .from('week_plans')
      .insert(planToSave)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ plan: savedPlan }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
