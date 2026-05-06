import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/preferences/get?anon_id=<uuid>
 * Returns the user_preferences row for the given anonymous ID, or null if not found.
 */
export async function GET(request: NextRequest) {
  const anon_id = request.nextUrl.searchParams.get('anon_id')
  if (!anon_id) {
    return NextResponse.json({ error: 'anon_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_preferences')
    .select('*')
    .eq('anon_id', anon_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "The result contains 0 rows" — not an error for us
    return NextResponse.json({ error: 'Could not load preferences.' }, { status: 500 })
  }

  return NextResponse.json({ preferences: data ?? null })
}
