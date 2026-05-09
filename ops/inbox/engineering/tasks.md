# Engineering inbox — task queue
# Agents read this at session start and process in order
# Format: - [ ] TASK: [description] | Priority: [HIGH/MED/LOW] | From: [source]

## Phase 1 bugs

- [x] BUG-001: Home page and recipe detail query Supabase directly, bypassing API routes — may silently fail with RLS | Priority: HIGH | From: code audit 2026-05-07
  - Files: app/page.tsx:92-97, app/recipes/[id]/page.tsx:143-163
  - Both use createClient() (anon key) to query the recipes table directly. CLAUDE.md hard rule: all DB queries go through admin client in API routes, never in components.
  - Impact: if RLS blocks anonymous reads on recipes, home page hero shows no cook time / prep-ahead info and the "Let's cook →" button never appears. Recipe detail page shows "Recipe not found" for every recipe.
  - Fix: create GET /api/recipes/[id] route (admin client) and replace both direct client calls with fetch to that route.

- [x] BUG-002: Shopping list API falls through to return any user's most recent plan when anon_id is missing | Priority: HIGH | From: code audit 2026-05-07
  - File: app/api/shopping/generate/route.ts:87-91
  - When anon_id is falsy the planQuery runs without .eq('anon_id', ...) and returns the most recently created week_plans row in the entire DB — another user's data.
  - Reproduce: POST /api/shopping/generate with body {} — returns some user's shopping list.
  - Fix: add a 400 guard at the top of the route if anon_id is missing, consistent with how every other route handles it.

- [x] BUG-003: Regenerating a plan orphans cooked meals — cooking progress disappears | Priority: HIGH | From: code audit 2026-05-07
  - File: app/api/plans/generate-v2/route.ts:332-353
  - Every generate-v2 call INSERTs a brand-new week_plans row. When user marks meals cooked on plan A, then clicks "Rethink remaining →" and generates plan B, plan B is a new row. The home page and planner pivot to plan B (latest created_at). All cooked progress from plan A is invisible.
  - Reproduce: generate plan → mark one meal cooked → go to planner → click "Rethink remaining →" → generate again → cooked meal gone.
  - Fix: upsert on (anon_id, week_start_date) or keep the existing plan row and only replace the uncooked meals + re-insert those meals.

- [x] BUG-006: Preferences save fails in production with "Hmm, couldn't save your preferences. Give it one more try?" | Priority: HIGH | From: founder 2026-05-07
  - Flow: Onboarding — last step (cuisine selection) → save → error toast
  - Reproduce: complete all 3 onboarding steps on fresh session → submit cuisine step → error appears
  - Expected: preferences saved, redirected to /planner/generate
  - Actual: 500 error toast, user stuck on onboarding
  - Static audit shows route code is correct — likely a runtime issue (anon_id not yet set in localStorage when save fires, or Supabase admin client env var issue in production)
  - File hint: app/onboarding/cuisine/page.tsx (save call), app/api/preferences/save/route.ts

- [x] BUG-007: Recipe bank (/recipes) queries Supabase directly — same violation as BUG-001 | Priority: HIGH | From: qa-agent 2026-05-07
  - Flow: Recipe bank page
  - Reproduce: navigate to /recipes — direct createClient() call fetches all recipes with no anon_id filter
  - Expected: recipes fetched via /api/recipes/list (admin client, anon_id scoped)
  - Actual: direct Supabase SDK call in component, bypasses API route rule, no anon_id validation
  - File hint: app/recipes/page.tsx:27-35 — createClient().from('recipes').select('*').is('user_id', null)
  - Fix: create GET /api/recipes/list route (admin client) and replace component call

- [x] BUG-004: Marking a meal cooked from the planner auto-redirects to home after 1.6s with no opt-out | Priority: MED | From: code audit 2026-05-07
  - File: app/planner/page.tsx:111 — setTimeout(() => router.push('/'), 1600)
  - After marking any single meal cooked, the user is forcibly navigated home. Breaks the flow for users managing multiple meals (marking several as cooked, swapping others). No way to cancel or stay on planner.
  - Reproduce: open planner with multiple uncooked meals → mark one cooked → observe auto-navigation to home 1.6 s later.
  - Fix: remove the auto-redirect; let the toast message fade on its own and keep the user on the planner.

- [x] BUG-005: Recipe detail page (/recipes/[id]) has no BottomNav — users are stranded | Priority: MED | From: code audit 2026-05-07
  - File: app/recipes/[id]/page.tsx — root element is a bare <div>, no BottomNav imported or rendered.
  - After tapping "Let's cook →" (home) or "Recipe" (planner), users land on the recipe page with no way to navigate elsewhere except the "Back" button. On mobile web there is no persistent nav.
  - Initial fix (2026-05-07): added <BottomNav /> directly in page component — WRONG, created duplicate nav.
  - Corrected fix (2026-05-08): removed <BottomNav /> from page — layout.tsx already renders it globally for all routes. Verified by Playwright E2E regression test. Deployed via PR #2.

## Testing tasks
- [x] Set up test framework: Vitest + React Testing Library (decided 2026-05-07) | Priority: HIGH | From: founder — done: 2026-05-08 | agent: test-engineer
- [x] Write unit tests for lib/supabase/ client utilities | Priority: MED | From: founder — done: 2026-05-08 | agent: test-engineer
- [x] Write integration tests for /api/plans/generate-v2 | Priority: MED | From: founder — done: 2026-05-08 | agent: test-engineer
- [x] Write integration tests for /api/preferences/save | Priority: MED | From: founder — done: 2026-05-08 | agent: test-engineer
- [x] Set up Playwright E2E tests (54 tests across onboarding, home, planner, recipes flows) | Priority: MED | From: founder — done: 2026-05-08 | agent: test-engineer

## Feature improvements
- [x] IMP-001: generate-v2 saves last_pantry_input via update (no-op if prefs row missing) — use upsert instead | Priority: LOW | From: code audit 2026-05-07
  - File: app/api/plans/generate-v2/route.ts:384-387
  - Edge case: if preferences row doesn't exist at generate time, pantry pre-fill on next visit never works.

## Processed (do not delete — useful context)
# - [x] [TASK]: [description] — done: [date] | agent: [who did it]
- [x] BUG-003: Regenerating a plan orphans cooked meals — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-004: Planner auto-redirect on mark cooked — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-005: Recipe detail no BottomNav — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-006: Preferences save failure — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-007: Recipe bank direct Supabase call — done: 2026-05-07 | agent: backend-engineer
