import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const anon_id = request.nextUrl.searchParams.get('anon_id')
  if (!anon_id) {
    return NextResponse.json({ error: 'anon_id required', code: 'MISSING_ANON_ID' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('recipes')
    .select('id, name, cuisine_type, meal_type, cook_time_minutes, servings, is_complete_meal, created_at')
    .eq('anon_id', anon_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[recipes/list] error', error)
    return NextResponse.json({ error: 'Could not load recipes.', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ recipes: data ?? [] })
}
