import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'id required', code: 'MISSING_ID' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('recipes')
    .select('id, name, cuisine_type, meal_type, cook_time_minutes, servings, ingredients, steps, steps_v2, prep_ahead, is_complete_meal, source_type, source_url')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Recipe not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ recipe: data })
}
