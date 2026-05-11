# Active sprint
# TOKEN BUDGET: 200 | Overwrite each sprint — no history here, git has it

Sprint: S02 | Goal-based — no end date (solo founder, async pace)
Goal: Enable the "any-day moment" — founder (or any future user) opens the app on any day of the week, tells it what protein she has and how many brunch/dinner days remain, and walks away with a brunch plan + dinner plan for those days + one shopping list. Zero decisions left to make.

---

## In progress
(Moved from Ready when engineering starts)

## Ready — S02 features (work in stage order — see engineering inbox for full AC)

- [FEAT-001] Flexible meal types + prep-ahead + home card
  - Schema: meal_type enum on meals; meal_types_default[], meal_days_default jsonb, meal_prefs jsonb on user_preferences; prep_friendly + assembly_time_mins on recipes
  - meal_prefs drives prep_ahead per meal type — NOT hardwired to brunch; extensible to any future meal type/user pattern
  - Planning form: meal type chips (Breakfast/Brunch/Lunch/Dinner) + days stepper per selected type
  - generate-v2: slots per meal type from meal_plan input; planning window = today onwards
  - Home card: state machine driven by cooked flag — uncooked → show meal + [Mark as cooked]; cooked → rotate to next priority (dinner or tomorrow's prep)
  - Planner: two sections (prep-ahead meals / other meals); [Swap] + [Remove] per card; "Rethink remaining" REMOVED
  - Remove meal: clear a slot, no AI, no replacement
  - AC: [ ] Planning form shows meal type chips + day steppers; pre-fills from profile defaults
        [ ] meal_prefs.prep_ahead drives prep_ahead requirement at generation time (not meal type label)
        [ ] generate-v2 produces correct slots per meal type; window starts from today
        [ ] Prep-ahead meals have prep_ahead.tonight + prep_ahead.tomorrow populated
        [ ] Home card shows [Mark as cooked] CTA and rotates state on cooked
        [ ] Planner groups by section; each card has [Swap] + [Remove]
        [ ] Remove meal clears slot, no AI call, no replacement
        [ ] "Rethink remaining" button is gone from the planner

- [FEAT-002] Recipe bank import + browsing
  - Import modal: name + recipe_type chip (Main/Side/Salad/Complete meal) + meal type chips + optional source_url + paste area
  - No completeness check, no Serve With prompt at import — clean save, no friction
  - source_url stored as reference link; shown as link icon on recipe card
  - Recipe bank: filter chips by recipe_type + meal_type
  - Only Main + Complete meal recipes enter the plan generation candidate list; Sides/Salads are browse-only
  - AC: [ ] User pastes any text + optional URL → saved immediately, no AI at import time
        [ ] recipe_type and meal_type tags set at import via chips
        [ ] source_url link icon opens URL in new tab from recipe card
        [ ] Bank filter chips work for recipe_type and meal_type
        [ ] Sides and Salads excluded from plan generation candidate list
        [ ] "Yours" label on user-imported cards

- [FEAT-003] Bank-first plan generation + protein-first prompt + health goal
  - user_preferences: add `health_goals` text field (e.g., "high protein, balanced") — collected in onboarding Q4 or profile
  - generate-v2: fetch user's recipe bank (filtered by meal_type, not excluded_from_plans) → seed prompt with bank recipes as candidate list → instruct AI to prefer bank recipes, generate new ones only to fill gaps
  - Prompt heuristic: protein-first — "Pick a protein source for each meal, then choose carbs and vegetables that complement it"
  - Prompt constraint: health_goals field passed as hard planning constraint
  - AC: [ ] Plan uses at least one imported recipe per meal type per week (if bank has coverage)
        [ ] New recipes generated only when bank has fewer than N candidates for that meal type
        [ ] health_goals constraint visible in generated recipe choices (e.g., no low-protein meals)
        [ ] "Won't make again" recipes excluded from candidate list

- [FEAT-004] Prep-ahead elevation for brunch
  - All brunch recipes must have prep_ahead populated: { "tonight": "X (Y min)", "tomorrow": "assemble in Z min" }
  - generate-v2 prompt: for brunch recipes, required output field is prep_ahead — reject/retry if absent
  - Plan display: brunch card shows "Prep tonight: X" as primary action, not just recipe name
  - AC: [ ] Every brunch recipe in generated plan has prep_ahead instructions
        [ ] Brunch card on planner shows prep_ahead.tonight prominently
        [ ] Assembly time shown on brunch card (≤ 30 min target enforced in prompt)

- [FEAT-005] Minimum viable learning loop — "Won't make again" exclusion
  - Migration: add `excluded_from_plans` boolean (default false) to recipes table
  - When user rates a meal "Won't make again": set excluded_from_plans = true on the linked recipe
  - generate-v2: filter out excluded recipes from bank candidate list
  - AC: [ ] "Won't make again" rating sets excluded_from_plans = true
        [ ] Excluded recipe never appears in future generated plans
        [ ] Recipe still visible in bank (soft exclude, not deleted)

## Ready — S01 carryover bugs (fix before adding any more features)

- [BUG-013] Cook mode unreachable — CRITICAL
  - "Let's cook" on home → /recipes/[id]; "Let's cook" on recipe detail → /planner; cook mode never loads
  - AC: [ ] "Let's cook" on home card enters step-by-step cook mode carousel
        [ ] "Let's cook" on recipe detail enters cook mode
        [ ] "Plan Tonight" on /kitchen navigates correctly (or button removed if deferred)
  - Files: app/kitchen/page.tsx, app/recipes/[id]/page.tsx, cook mode component routing

- [BUG-014] Recipe bank shows 47 cross-user / test recipes on fresh session
  - AC: [ ] Fresh session with no plan shows empty recipe bank
        [ ] Null user_id seed/test rows removed from production DB
  - Files: GET /api/recipes/list + Supabase recipes table

- [BUG-009] Plan generation takes ~25s — stream to hit <15s visible
  - AC: [ ] Plan tokens stream to UI as they arrive (user sees first meal under 5s)
        [ ] Shopping list generation async / non-blocking after plan displays
  - Files: app/api/plans/generate-v2/route.ts

## Blocked
- [FEAT-003] Needs PM to answer PM-008 (bank seeding rules) — see pm inbox — ANSWERED: seed prompt with full bank, AI picks from it, generates new only to fill gaps

## Needs founder decision
- [ ] Set Phase 1 completion date — without a hard date, Phase 1 has no end. Build deadline = 2 weeks before you want to start the active test period.
- [ ] Complete first real end-to-end brunch plan test once FEAT-001–004 ship — use your actual pantry, not a demo input

## Parked (not this sprint — revisit after Monday moment is working)
- BUG-010: Cook time missing from planner cards
- BUG-011: Stale reasoning note after swap
- BUG-012: Week strip day tap routing
- UX redesign implementation
- 80% service layer test coverage
- Profile screen (ENG-PRD-005)
- Mid-week regeneration scope (PM-010)
- Recipe identity dedup (PM-011)
- Variety engine hard contracts (PM-009)
- All remaining UX inbox items (UX-001, 003, 005–011)

## Done this sprint
(nothing yet — sprint starts 2026-05-12)

---

## Done in S01
- [x] BUG-001: Home/recipe direct Supabase queries — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-002: Shopping list leaks other user's data — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-003: Regenerating plan orphans cooked meals — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-004: Planner auto-redirect on mark cooked — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-005: Recipe detail no BottomNav — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-006: Preferences save failure in production — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-007: Recipe bank direct Supabase call — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-008: Q1 onboarding dietary restrictions skippable — done: 2026-05-10 | agent: frontend-engineer
- [x] Test framework: Vitest + RTL (25 tests) — done: 2026-05-08 | agent: test-engineer
- [x] Playwright E2E: 54 tests, 132/132 passing — done: 2026-05-08 | agent: test-engineer
- [x] PR #2 reviewed, merged, deployed — done: 2026-05-08
