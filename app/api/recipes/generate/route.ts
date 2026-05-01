import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { GeneratedRecipe } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are a recipe generator for an Indian household.
Generate a complete home-cook-friendly recipe for 2 servings,
low-carb where possible, high protein where applicable.
Return ONLY valid JSON: {name, cuisine_type, meal_type,
servings: 2, cook_time_minutes, ingredients [{name,quantity,unit}],
steps [string], macros_per_serving {protein_g,carbs_g,fat_g},
batch_cookable, source_type: "ai_generated"}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dish_name, modifier } = body as { dish_name: string; modifier?: string }

    if (!dish_name || typeof dish_name !== 'string' || dish_name.trim() === '') {
      return NextResponse.json({ error: 'dish_name is required' }, { status: 400 })
    }

    const userMessage = modifier
      ? `Generate a recipe for: ${dish_name.trim()}, ${modifier.trim()}`
      : `Generate a recipe for: ${dish_name.trim()}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let recipe: GeneratedRecipe
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      recipe = JSON.parse(jsonMatch[0]) as GeneratedRecipe
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse recipe from AI response', raw: rawText },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const recipeToSave = {
      user_id: user?.id ?? null,
      name: recipe.name,
      cuisine_type: recipe.cuisine_type,
      meal_type: recipe.meal_type,
      servings: recipe.servings ?? 2,
      cook_time_minutes: recipe.cook_time_minutes,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      macros_per_serving: recipe.macros_per_serving,
      batch_cookable: recipe.batch_cookable ?? false,
      source_type: 'ai_generated',
    }

    const { data: savedRecipe, error: dbError } = await supabase
      .from('recipes')
      .insert(recipeToSave)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ recipe: savedRecipe }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
