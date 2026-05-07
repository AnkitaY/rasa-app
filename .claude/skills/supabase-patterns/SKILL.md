---
name: supabase-patterns
description: Supabase best practices for Rasa — queries, RLS, auth, migrations. Load for all backend/database tasks.
---
# Supabase patterns for Rasa

## Client setup
- Route handlers (API routes): import { createAdminClient } from '@/lib/supabase/admin'
- Client components: import { createClient } from '@/lib/supabase/client'
- Server components (SSR): import { createClient } from '@/lib/supabase/server'
- Admin client bypasses RLS — use for all server-side DB writes/reads in route handlers

## Pre-auth pattern (all Phase 1 routes)
```ts
// Extract anon_id from request body
const { anon_id, ...otherFields } = await request.json()
if (!anon_id) return Response.json({ error: 'Missing anon_id', code: 'MISSING_ANON_ID' }, { status: 400 })

const admin = createAdminClient()
const { data } = await admin
  .from('table')
  .select('*')
  .eq('anon_id', anon_id)
  .maybeSingle()
```

## Standard query pattern
```ts
const admin = createAdminClient()
const { data, error } = await admin
  .from('meal_plans')
  .select('*, meals(*)')
  .eq('anon_id', anon_id)
  .is('deleted_at', null)  // always filter soft-deleted
  .order('created_at', { ascending: false })
if (error) return Response.json({ error: 'Database error', code: 'DB_ERROR' }, { status: 500 })
```

## Rasa database tables (Phase 1)
- user_preferences: id, anon_id (unique), dietary_rules, who_cooking_for, primary_cuisine, secondary_cuisines[], skill_level, weeknight_budget, goals[], banned_ingredients, cook_days_per_week, last_pantry_input, created_at
- week_plans: id, user_id (NULL), anon_id, week_start_date, slots (JSONB: GeneratedPlan), pantry_snapshot, week_context, use_soon_text
- meals: id, week_plan_id (FK), day, meal_type, recipe_name, eating_out, serve_with, reasoning, cooked, cooked_at, swapped_from, verdict, verdict_shown, notes, use_soon_priority, created_at
- recipes: id, user_id, name, cuisine_type, meal_type, servings, cook_time_minutes, ingredients (JSONB), steps (JSONB legacy), steps_v2 (JSONB), prep_ahead (JSONB), is_complete_meal, source_type, source_url, batch_cookable

## Migrations
- File: supabase/migrations/[timestamp]_[description].sql
- Never edit existing migration files
- Always include rollback comment at top

## Never do
- .or('user_id.eq.null,...') — passes "null" as UUID string, causes uuid parse error
- Hard DELETE — always use deleted_at soft delete
- Write to DB from server components — route handlers only
- Chain .finally() on Supabase PromiseLike — async/await only
