# Engineering inbox — task queue
# Agents read this at session start and process in order
# Format: - [ ] TASK: [description] | Priority: [HIGH/MED/LOW] | From: [source]

## S02 — Build order (work top to bottom)

---

### STAGE 1 — Fix core loop first (bugs block everything)
Run BUG-013, BUG-014, BUG-009 in parallel — no dependencies between them.

- [x] BUG-013: Cook mode unreachable — CRITICAL | Priority: CRITICAL | From: pm-agent 2026-05-09
  - done: 2026-05-11 | agent: frontend-engineer
  - AC: [x] "Let's cook" on home card → /cook/[id] (new standalone cook mode page)
        [x] "Let's cook" on recipe detail → /cook/[id]
        [x] "Plan Tonight" on /kitchen removed (not specced for Phase 1); empty state updated
  - Also: "Full plan" CTA on home renamed "View full recipe" → /recipes/[id] (UX-002)

- [x] BUG-014: Recipe bank shows 47 cross-user recipes on fresh session | Priority: HIGH | From: pm-agent 2026-05-09
  - done: 2026-05-11 | agent: backend-engineer
  - AC: [x] Fresh session shows empty recipe bank (0 recipes)
        [x] Null anon_id seed rows soft-deleted from production DB (deleted_at = now())
  - Files: GET /api/recipes/list, supabase migration, import/generate/manual routes + callers

- [ ] BUG-009: Plan generation ~25s — stream to <15s visible | Priority: HIGH | From: pm-agent 2026-05-09
  - AC: [ ] Plan tokens stream to UI; first meal visible under 5s
        [ ] Shopping list generation async after plan displays
  - Files: app/api/plans/generate-v2/route.ts

---

### STAGE 2 — Schema migration (one migration covers FEAT-001 + FEAT-002 + FEAT-005)
Do this as a single Supabase migration before any feature work. Read existing migrations in supabase/migrations/ first.

```sql
-- meals table
ALTER TABLE meals
  ADD COLUMN meal_type text NOT NULL DEFAULT 'dinner'
    CHECK (meal_type IN ('breakfast','brunch','lunch','dinner'));

-- recipes table
ALTER TABLE recipes
  ADD COLUMN raw_text          text,
  ADD COLUMN source            text DEFAULT 'ai_generated'
    CHECK (source IN ('ai_generated','user_imported')),
  ADD COLUMN recipe_type       text DEFAULT 'complete_meal'
    CHECK (recipe_type IN ('main','side','salad','complete_meal')),
  ADD COLUMN meal_type         text DEFAULT 'any'
    CHECK (meal_type IN ('breakfast','brunch','lunch','dinner','any')),
  ADD COLUMN prep_friendly     bool DEFAULT false,
  ADD COLUMN assembly_time_mins int,
  ADD COLUMN source_url        text,
  ADD COLUMN excluded_from_plans bool DEFAULT false;

-- user_preferences table
ALTER TABLE user_preferences
  ADD COLUMN meal_types_default text[]  DEFAULT ARRAY['brunch','dinner'],
  ADD COLUMN meal_days_default  jsonb   DEFAULT '{"brunch":5,"dinner":2}',
  ADD COLUMN meal_prefs         jsonb   DEFAULT '{"brunch":{"prep_ahead":true,"max_assembly_mins":30},"dinner":{"prep_ahead":false}}',
  ADD COLUMN health_goals       text    DEFAULT 'high protein, balanced';
```

AC: [x] Migration runs clean on production (test on branch first)
    [x] All existing rows unaffected (new columns have safe defaults)
- done: 2026-05-11 | agent: backend-engineer
- Note: meals.meal_type already existed (no-op ADD COLUMN; check constraint added separately). recipes.meal_type already existed (skipped check constraint — one row with 'lunch/dinner' value). recipes.source_url already existed (skipped). All other columns added. lib/types.ts updated.

---

### STAGE 3 — Recipe bank import (FEAT-002)
Build this before FEAT-001 so the founder can seed her bank while FEAT-001 is being built.
PRD: docs/prd/feat-002-recipe-bank-import.md

- [ ] FEAT-002a: POST /api/recipes/import route | Priority: HIGH | From: pm-agent 2026-05-11
  - Inputs: anon_id, name, raw_text, recipe_type, meal_type[], source_url (optional)
  - Stores: all fields + source='user_imported' scoped to anon_id
  - No AI calls at import time — raw save only
  - AC: [ ] Route validates anon_id, name, raw_text, recipe_type present; 400 if missing
        [ ] Recipe saved with correct anon_id scoping
        [ ] source_url stored as-is (no validation or fetch)

- [ ] FEAT-002b: Import modal UI on /recipes page | Priority: HIGH | From: pm-agent 2026-05-11
  - "Add recipe" button → modal: name field + recipe_type chips (Main/Side/Salad/Complete meal, single-select) + meal_type chips (Breakfast/Brunch/Lunch/Dinner/Any, multi-select, default Any) + source_url field (optional) + paste area
  - Save disabled until name + recipe_type + raw_text filled
  - On save: optimistic update, recipe card appears immediately, toast "Added to your bank"
  - Source URL shown as link icon on recipe card; opens in new tab
  - "Yours" label on user-imported cards
  - AC: [ ] All fields wired correctly to POST /api/recipes/import
        [ ] Save guard works (disabled until required fields filled)
        [ ] Recipe card appears without page reload
        [ ] Source URL link icon opens in new tab

- [ ] FEAT-002c: Recipe bank filter chips | Priority: HIGH | From: pm-agent 2026-05-11
  - Filter row above recipe grid: [All] [Main] [Side] [Salad] [Complete meal] + [Any] [Breakfast] [Brunch] [Lunch] [Dinner]
  - Filters additive — "Side + Dinner" shows sides tagged dinner or Any
  - Default: All, no active filter
  - AC: [ ] Filter chips render and work client-side (no new API call needed if recipes already fetched)
        [ ] Multiple active filters narrow correctly
        [ ] Clearing filters returns full list

---

### STAGE 4 — Meal types + planning form + home card (FEAT-001)
PRD: docs/prd/feat-001-brunch-meal-type.md — read fully before starting.

- [ ] FEAT-001a: Planning form — meal type selection + day counts | Priority: HIGH | From: pm-agent 2026-05-11
  - Replace current form header with: meal type chips (Breakfast/Brunch/Lunch/Dinner, multi-select) + days stepper per selected type
  - Pre-fill from user_preferences.meal_days_default on returning visits
  - Send as meal_plan JSON to generate-v2: `{"brunch":5,"dinner":2}`
  - AC: [ ] Chips + steppers render; steppers only show for selected meal types
        [ ] Defaults pre-filled on return visit
        [ ] meal_plan JSON sent correctly to generate-v2

- [ ] FEAT-001b: generate-v2 — meal type slots + rolling planning window | Priority: HIGH | From: pm-agent 2026-05-11
  - Accept plan_start_date (today) + meal_plan JSON
  - Generate slots per meal type; distribute across remaining days from plan_start_date
  - Read meal_prefs from user_preferences to determine prep_ahead requirement per meal type
  - For prep_ahead meal types: require prep_ahead.tonight + prep_ahead.tomorrow in output; assembly_time_mins ≤ max_assembly_mins; re-prompt once if missing
  - For non-prep_ahead meal types: prep_ahead optional
  - Post-generation: validate variety constraints; re-prompt once on failure (see FEAT-003 for full list)
  - AC: [ ] Correct number of slots per meal type generated
        [ ] Slots assigned to correct remaining days (not always from Monday)
        [ ] Prep-ahead meals have prep_ahead populated; validated post-generation
        [ ] Non-prep-ahead meals not required to have prep_ahead

- [ ] FEAT-001c: Planner display — meal type sections + Remove meal | Priority: HIGH | From: pm-agent 2026-05-11
  - Group meals by meal_type in planner view (prep-ahead types first)
  - Each card: meal name + relevant subtitle + [Swap] + [Remove]
  - Prep-ahead card subtitle: prep_ahead.tonight (or prep_ahead.tomorrow on day-of)
  - Remove meal: DELETE or soft-delete the meal slot; no AI, no confirmation dialog
  - Remove "Rethink remaining" button entirely
  - AC: [ ] Meals grouped by meal type with section labels
        [ ] Prep-ahead card shows prep_ahead instruction as subtitle
        [ ] [Remove] clears slot silently
        [ ] "Rethink remaining" gone

- [ ] FEAT-001d: Home "What's Cooking" card — state machine + three CTAs | Priority: HIGH | From: pm-agent 2026-05-11
  - State machine (cooked-flag driven, no clock logic):
    - Meal not cooked → show meal card with [Let's cook] + [Swap] + [Mark as cooked ✓]
    - Meal marked cooked → rotate to next priority: dinner (if today) → tomorrow's prep-ahead → empty state
  - [Swap] on home card opens same swap sheet as planner — no new UI, just a new entry point
  - Swap reasons (updated set — see UX-014 in ux inbox for copy):
    1. "Forgot to prep" — only shown for prep-ahead meal types; AI returns zero-prep alternatives only
    2. "No time right now" — quickest option, ≤ 20 min
    3. "Not feeling it" — different flavour, same time budget
    4. "Missing an ingredient" — AI works around specified missing item
  - AC: [ ] Three CTAs on home card for every active meal
        [ ] Swap on home card works identically to planner swap
        [ ] "Forgot to prep" reason only appears for prep-ahead meal types
        [ ] "Forgot to prep" response excludes any recipe with prep_ahead required
        [ ] Card rotates to next priority on cooked; does not require page refresh

- [ ] FEAT-001e: Profile — "My cooking" section | Priority: MED | From: pm-agent 2026-05-11
  - Meal type chips (multi-select) + typical days stepper per selected type
  - Saved to meal_types_default + meal_days_default + meal_prefs in user_preferences
  - health_goals free text field with chip suggestions: "High protein, balanced" · "Lighter meals" · "Family-friendly" · "Quick and simple"
  - AC: [ ] Profile saves meal defaults correctly
        [ ] health_goals saved to user_preferences.health_goals
        [ ] Planning form pre-fills from saved profile on next visit

---

### STAGE 5 — Bank-first generation + learning loop (FEAT-003 + FEAT-005)
PRD: docs/prd/feat-003-bank-first-generation.md — read fully before starting.
Depends on: FEAT-002 (recipes in bank) + FEAT-001b (meal_type on recipes for filtering)

- [ ] FEAT-005: excluded_from_plans wired to "Won't make again" | Priority: HIGH | From: pm-agent 2026-05-11
  - Schema done in Stage 2 migration
  - When verdict = "Won't make again": UPDATE recipes SET excluded_from_plans = true WHERE id = linked recipe
  - AC: [ ] "Won't make again" verdict sets excluded_from_plans = true
        [ ] Recipe remains visible in bank (not deleted)
        [ ] Recipe never appears in plan generation candidate list

- [ ] FEAT-003: Bank-first plan generation + protein-first + health_goals | Priority: HIGH | From: pm-agent 2026-05-11
  - Before calling Claude: fetch user recipe bank filtered by meal_type + NOT excluded_from_plans; recipe_type IN ('main','complete_meal') only
  - Build candidate list; pass to prompt with instruction: prefer bank recipes, generate new only when < 2 candidates per slot
  - Add to system prompt (verbatim):
    - Protein-first: "For each meal slot, choose the protein source first based on pantry and health goals. Then select carbohydrates and vegetables that complement it."
    - Health goals (hard constraint): fetch from user_preferences.health_goals
    - Fusion guard: "Do not combine ingredients or techniques from different culinary traditions within a single dish unless the user has explicitly asked for fusion in their week context."
    - Pantry quantities: "Proteins and fresh vegetables without quantities are available for one meal only. Pantry staples — spices, oils, canned goods, dry grains — are assumed abundant."
  - Post-generation validation (re-prompt once on failure):
    - Use-soon items in first 2 day-slots
    - No same protein on consecutive days
    - No same carb base 3+ times in plan
  - For user-imported recipes selected from bank: pass raw_text; for AI-generated: pass steps_v2 summary
  - AC: [ ] Candidate list fetched and passed to prompt before generation
        [ ] Bank recipes used when ≥ 2 candidates available per slot
        [ ] New recipes generated only when bank coverage < 2 per slot
        [ ] Selected bank recipes referenced by ID — not re-saved
        [ ] All four prompt additions present in system prompt
        [ ] Post-generation validation runs; re-prompts once on failure
        [ ] health_goals fetched server-side from user_preferences

---

### STAGE 6 — Generation quality check (before shipping to founder)

- [ ] ENG-PRD-001: Validate AI generation quality across meal types | Priority: HIGH | From: pm-agent 2026-05-09
  - Run 10 brunch + 10 dinner pantry inputs through generate-v2 after FEAT-001b + FEAT-003 are done
  - Score each: complete meal? prep_ahead populated for brunch? timing coherent? shopping list extractable?
  - Document failure modes; fix prompt before founder uses app for real planning
  - Do not ship FEAT-003 to production without passing this check

## Parked — not this sprint

- [ ] BUG-010: Cook time missing from planner cards | PARKED
- [ ] BUG-011: Stale reasoning note after swap | PARKED
- [ ] BUG-012: Week strip day tap routing | PARKED
- [ ] ENG-PRD-004: Broader latency instrumentation | PARKED — BUG-009 covers immediate need
- [ ] ENG-PRD-005: Profile screen | PARKED — needed before UX redesign, but UX redesign is parked
- [ ] IMP-001: generate-v2 upsert for last_pantry_input | PARKED (low impact)

## Processed (do not delete — useful context)
- [x] BUG-001: Home page and recipe detail direct Supabase queries — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-002: Shopping list data leak (no anon_id guard) — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-003: Regenerating plan orphans cooked meals — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-004: Planner auto-redirect on mark cooked — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-005: Recipe detail no BottomNav — done: 2026-05-07/08 | agent: backend-engineer + frontend-engineer
- [x] BUG-006: Preferences save failure in production — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-007: Recipe bank direct Supabase call — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-008: Q1 dietary restrictions skippable — done: 2026-05-10 | agent: frontend-engineer
- [x] Test framework: Vitest + RTL (25 tests) — done: 2026-05-08 | agent: test-engineer
- [x] Playwright E2E: 54 tests, 132/132 passing — done: 2026-05-08 | agent: test-engineer
- [x] IMP-001: generate-v2 upsert for last_pantry_input — done: 2026-05-07 | agent: backend-engineer
