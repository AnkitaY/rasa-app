# RASA Phase 1 — Full Engineering Implementation Plan

## Context

Phase 0.5 (HANDOFF-ENG-UX-001) delivered the Kinfolk visual system. Phase 1 is a functional rebuild driven by `rasa_phase1_eng_handoff.html` and the engine specification in `rasa_plan_engine_v2.html`. The core philosophy shift:

- **No persistent inventory.** The fridge database is replaced by a fresh pantry snapshot typed at plan generation time. Shopping list is a one-way output — no back-sync.
- **AI generates complete-meal recipes.** The recipe bank starts empty and grows as a byproduct of planning. The AI is not constrained to pick from the bank.
- **No macros shown.** Healthy by default. No protein/carb numbers anywhere in Phase 1.
- **Onboarding is 3 questions then immediate value** — pantry snapshot → first plan in under 15 seconds.
- **Tone of voice:** warm trusted friend, not clinical app. Every label, empty state, and confirmation must follow the voice rules in the spec.
- Phase 1 does NOT ship auth — all rows `user_id IS NULL`, identity from `rasa_anon_id` in localStorage.

---

## Critical Technical Constraints

| Constraint | Detail |
|---|---|
| Next.js 14 App Router | `'use client'` on all interactive pages |
| shadcn/ui v4.6 base-nova | Uses `@base-ui/react`, NO `asChild` prop, NO Radix UI |
| Tailwind CSS v3 | Standard `@tailwind` directives, NOT `@import "tailwindcss"` |
| ESLint at build time | Unused vars + unescaped apostrophes = build failure |
| Supabase pre-auth | All writes via `adminClient` (service role); `user_id IS NULL` |
| `week_plans.slots` JSONB | Keep populated for Kitchen feature backward compat |
| Steps dual-shape | Old: `string[]`; Phase 1 AI: `{instruction, tip_type, tip_text}[]` — handle both |
| SwapSheet | No Sheet in base-nova — build from `@base-ui/react/dialog` |
| DM Sans font | `DM_Sans` (underscore), variable `--font-dm-sans` |

---

## Design Tokens (Phase 1 Palette — supersedes Kinfolk)

```css
/* globals.css — add alongside existing rasa-* tokens (do NOT remove them) */
--p1-cream:    #FAF7F2;   /* page bg */
--p1-terra:    #C4522A;   /* primary / CTAs */
--p1-forest:   #2D5B3F;   /* success / cooked state */
--p1-nav:      #2B1C12;   /* bottom nav bg */
--p1-nav-text: #F5EDE0;   /* nav inactive label */
--p1-sand:     #E8DDD0;   /* card borders */
--p1-fog:      #F2EDE6;   /* card bg */
--p1-ink:      #1A1108;   /* primary text */
--p1-muted:    #8C7B6E;   /* muted text */
```

Tailwind (`tailwind.config.ts`):
```ts
'p1-cream': 'var(--p1-cream)',
'p1-terra': 'var(--p1-terra)',
'p1-forest': 'var(--p1-forest)',
'p1-nav':   'var(--p1-nav)',
'p1-nav-text': 'var(--p1-nav-text)',
'p1-sand':  'var(--p1-sand)',
'p1-fog':   'var(--p1-fog)',
'p1-ink':   'var(--p1-ink)',
'p1-muted': 'var(--p1-muted)',
```

Font (`app/layout.tsx`):
```ts
import { DM_Sans } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
// add --font-dm-sans to body className
```

---

## Tone of Voice Rules (must apply to every string in Phase 1 code)

| Do | Don't |
|---|---|
| "Your week is sorted. 7 dinners, zero decision fatigue." | "Meal plan generated successfully. 7 meals added." |
| "Anything we should never put on the menu?" | "Please select your dietary restrictions." |
| "Hmm, something went wrong. Give it one more try?" | "Error: Failed to generate plan." |
| "Your recipe bank is empty for now — it fills up the moment you generate your first plan." | "No recipes found. Add recipes to get started." |
| Use contractions. Active voice. Short sentences. | No jargon. No guilt. Never say "successfully." |

---

## Database Migration

```sql
-- 1. user_preferences (onboarding + profile)
CREATE TABLE user_preferences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id          text UNIQUE NOT NULL,
  dietary_rules    text,               -- free text: "vegetarian" / "halal, no shellfish" / null
  who_cooking_for  text NOT NULL DEFAULT 'me_and_partner',
                                       -- 'just_me'|'me_and_partner'|'family_young_kids'|'family_teens'
  primary_cuisine  text,               -- e.g. 'Indian'
  secondary_cuisines text[],           -- e.g. ['Italian','Mediterranean']
  -- progressive (profile screen, optional)
  skill_level      text,               -- 'finding_my_feet'|'pretty_confident'|'enjoy_challenge'
  weeknight_budget text,               -- 'under_30'|'30_to_45'|'hour_is_fine'
  goals            text[],             -- ['affordability','explorer','comfort_first']
  banned_ingredients text,             -- free text: "no mushrooms, no liver"
  cook_days_per_week int DEFAULT 5,    -- how many nights she typically cooks
  created_at       timestamptz DEFAULT now()
);

-- 2. meals (normalized plan rows — replaces week_plans.slots for display)
CREATE TABLE meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id    uuid REFERENCES week_plans(id) ON DELETE CASCADE,
  day             text NOT NULL,         -- 'Mon'–'Sun'
  meal_type       text NOT NULL DEFAULT 'dinner',
  recipe_name     text NOT NULL,
  eating_out      boolean NOT NULL DEFAULT false,
  serve_with      text,                  -- "Serve with jeera rice and raita"
  reasoning       text,                  -- "Monday uses your spinach before it expires."
  cooked          boolean NOT NULL DEFAULT false,
  swapped_from    text,
  verdict         text,                  -- 'loved'|'ok'|'skip'
  notes           text,
  created_at      timestamptz DEFAULT now()
);
-- NOTE: No protein_g / carbs_g — macros are not shown in Phase 1

-- 3. Alter recipes for Phase 1 AI-generated recipe shape
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS steps_v2    jsonb,   -- [{instruction, tip_type, tip_text}]
  ADD COLUMN IF NOT EXISTS serve_with  text,
  ADD COLUMN IF NOT EXISTS source_url  text,
  ADD COLUMN IF NOT EXISTS image_url   text,
  ADD COLUMN IF NOT EXISTS is_complete_meal boolean DEFAULT true;
  -- is_complete_meal: false for single-dish user imports that need a "Serve with"

-- 4. Alter week_plans: store pantry snapshot + context used to generate
ALTER TABLE week_plans
  ADD COLUMN IF NOT EXISTS anon_id          text,
  ADD COLUMN IF NOT EXISTS pantry_snapshot  text,
  ADD COLUMN IF NOT EXISTS week_context     text,
  ADD COLUMN IF NOT EXISTS use_soon_text    text;

-- 5. RLS (open for pre-auth)
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_meals" ON meals FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_prefs" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
```

**inventory_items table:** Keep as-is. The Kitchen feature depends on it. The nav "Fridge" tab is replaced by "This Week" (plan generation). inventory_items is not used as plan input in Phase 1.

---

## File Map

### New files
| File | Purpose |
|---|---|
| `app/onboarding/page.tsx` | Q1: dietary rules (free text) |
| `app/onboarding/who-for/page.tsx` | Q2: who are you cooking for (single select) |
| `app/onboarding/cuisine/page.tsx` | Q3: primary + secondary cuisine |
| `app/onboarding/pantry/page.tsx` | Post-onboarding: pantry snapshot → generate first plan |
| `app/plan/page.tsx` | Weekly plan generation: pantry + context + use-soon → generate |
| `app/profile/page.tsx` | Progressive prefs: skill, time, goals, banned ingredients |
| `app/api/preferences/save/route.ts` | POST/PATCH upsert user_preferences |
| `app/api/plans/generate-v2/route.ts` | AI generates complete-meal recipes + saves to bank + writes meals rows |
| `app/api/meals/swap/route.ts` | AI suggests swap, replaces meal row |
| `app/api/meals/cooked/route.ts` | PATCH meal.cooked = true |
| `app/api/meals/verdict/route.ts` | PATCH meal.verdict |
| `app/api/recipes/import/route.ts` | POST import recipe from URL, detect completeness, suggest serve_with |
| `app/components/SwapSheet.tsx` | Bottom drawer via @base-ui/react/dialog |
| `lib/anon.ts` | `getAnonId()` — localStorage `rasa_anon_id` |

### Files to modify
| File | Changes |
|---|---|
| `app/layout.tsx` | Add DM_Sans, OnboardingGuard |
| `app/globals.css` | Add p1-* CSS vars |
| `tailwind.config.ts` | Add p1-* colors, font-ui (DM Sans) |
| `app/components/BottomNav.tsx` | Dark nav, new tab order: Home / This Week / Planner / Recipes / Shop |
| `app/page.tsx` | Home V2: tonight's meal, verdict, no macros |
| `app/planner/page.tsx` | Planner V2: reads meals table, SwapSheet, reasoning shown, no macros |
| `app/recipes/[id]/page.tsx` | steps_v2 support, serve_with, is_complete_meal |
| `app/shopping/page.tsx` | Tone-of-voice copy updates |
| `app/api/shopping/generate/route.ts` | Read from meals table (pantry snapshot delta logic) |
| `lib/types.ts` | Add UserPreferences, Meal, RecipeStep types |

### Files to leave untouched
- `app/inventory/page.tsx` — accessible at /inventory but not in nav
- `app/api/kitchen/` — Kitchen feature untouched
- `app/components/KitchenHomeCard.tsx` — untouched
- `app/recipes/page.tsx` — tone-of-voice copy only (minor)

---

## Implementation Sessions (12 total)

### Session 1 — Foundation: DB + Tokens + Types + anon identity
1. Run DB migration SQL above via Supabase MCP
2. Add p1-* CSS vars to `app/globals.css` (keep rasa-* tokens)
3. Add p1-* colors + `font-ui` (DM Sans) to `tailwind.config.ts`
4. Add `DM_Sans` + `--font-dm-sans` to `app/layout.tsx`
5. Add `RecipeStep`, `UserPreferences`, `Meal` types to `lib/types.ts`
6. Create `lib/anon.ts` with `getAnonId()` (localStorage, client-side only)
**Verify:** `npm run build` clean, tables in Supabase dashboard.

### Session 2 — Navigation Rebuild
- `BottomNav.tsx`: dark nav, tabs: Home / This Week (`/plan`) / Planner / Recipes / Shop
- Create `app/profile/page.tsx` skeleton
**Verify:** All 5 tabs navigate, dark nav renders.

### Session 3 — Onboarding Screens (3 questions)
- `app/onboarding/page.tsx` — Q1: dietary free text textarea
- `app/onboarding/who-for/page.tsx` — Q2: 4 tap-card single select
- `app/onboarding/cuisine/page.tsx` — Q3: primary pick + optional secondary chips
- Store progress in `sessionStorage` key `rasa_ob` as JSON
**Verify:** 3 steps render, navigation works, sessionStorage populates.

### Session 4 — Onboarding Pantry + Preferences Save + Guard
- `app/api/preferences/save/route.ts` — adminClient upsert by anon_id
- `app/onboarding/pantry/page.tsx` — 3-field form (pantry, week context, use soon) → saves prefs + generates first plan → redirects to `/planner`
- `OnboardingGuard` in `app/layout.tsx` — checks anon_id + prefs row, redirects to `/onboarding` if missing, excludes `/onboarding/**`
**Verify:** Full onboarding saves prefs row, generates plan, lands on planner.

### Session 5 — Plan Generation V2 API
Create `app/api/plans/generate-v2/route.ts`:

**Inputs:** `anon_id`, `pantry_snapshot` (free text), `week_context` (free text), `use_soon_text` (free text), existing recipes from bank (optional context).

**Claude generation order:**
1. Hard constraints: dietary_rules, banned_ingredients, who_cooking_for
2. Prioritise use_soon → Mon/Tue meals
3. Parse week_context → busy nights (quick meals), occasions (treat meals)
4. Primary cuisine 60–70%, secondary weaved in
5. Skill ceiling + weeknight time budget per day
6. Generate `cook_days_per_week` complete-meal recipes (protein + carb + veg)
7. Variety engine: no back-to-back same protein, effort rhythm
8. One-sentence reasoning per meal

**Output:** meals array + full recipe per meal. AI invents recipes — does not require bank.

**Writes:** save each recipe to `recipes` table, create `week_plans` row (with pantry snapshot), write `week_plans.slots` JSONB (Kitchen compat), create `meals` rows.

**Pattern:** reuse Claude API call from `app/api/plans/generate/route.ts`.

### Session 6 — "This Week" Returning User Screen
Create `app/plan/page.tsx`: same 3-field form as onboarding pantry, shows prefs summary, "Rebuild my week" CTA → generate-v2 → redirect to planner.

### Session 7 — Planner V2
Modify `app/planner/page.tsx`:
- Fetch from `meals` table (latest week_plan_id)
- Day-grouped vertical list: recipe name + serve_with + reasoning sentence
- Cooked badge (forest green), Swap button → SwapSheet
- Remove all macro numbers, protein bars, lock slots

### Session 8 — SwapSheet + Swap/Cooked APIs
- `app/components/SwapSheet.tsx`: `@base-ui/react/dialog`, slide-up from bottom, 3 actions
- `app/api/meals/swap/route.ts`: AI replacement, saves to bank, updates meal row
- `app/api/meals/cooked/route.ts`: PATCH cooked = true

### Session 9 — Home V2 + Verdict API
- `app/page.tsx`: tonight's meal from `meals` table, verdict row (loved/ok/skip) on cooked meals, no macros
- `app/api/meals/verdict/route.ts`: PATCH verdict + notes

### Session 10 — Recipe Detail V2 + Import API
- `app/recipes/[id]/page.tsx`: steps_v2 support, serve_with callout, no macros
- `app/api/recipes/import/route.ts`: Claude structures recipe from URL, detect is_complete_meal
- Wire up `app/recipes/add/import/page.tsx`

### Session 11 — Shopping List + Recipes Page
- `app/api/shopping/generate/route.ts`: read from meals table, subtract pantry_snapshot items (fuzzy match), fallback to slots
- `app/shopping/page.tsx`: tone-of-voice copy pass
- `app/recipes/page.tsx`: empty state copy + add Mediterranean chip

### Session 12 — Profile + CLAUDE.md + Smoke Test
- `app/profile/page.tsx`: full build — show/edit onboarding prefs, progressive fields (skill, budget, goals, banned)
- Update `CLAUDE.md` with Phase 1 architecture notes
- Full smoke test: onboarding → first plan → planner → swap → cooked → verdict → re-plan → shopping

---

## Patterns to Reuse

| Pattern | Location |
|---|---|
| Supabase admin client | `lib/supabase/admin.ts` |
| Claude API call | `app/api/plans/generate/route.ts` |
| `useTransition` + spinner | `app/shopping/page.tsx` lines ~96–127 |
| Skeleton `animate-pulse` | `app/page.tsx` `HomeSkeleton` |
| Error banner | `app/shopping/page.tsx` lines ~226–231 |
| DAY_ABBR constant | `app/page.tsx` line 15 |

---

## Risks & Gotchas

1. **DM Sans import:** `DM_Sans` not `DMSans`. Variable `--font-dm-sans`.
2. **Token names:** `p1-*` prefix — never rename existing `rasa-*` tokens.
3. **`week_plans.slots` backward compat:** Session 5 must convert meals → old PlanSlot[] shape and write it.
4. **SwapSheet:** No `Sheet` component in base-nova — `@base-ui/react/dialog` only.
5. **Onboarding redirect loop:** Guard must exclude `/onboarding/**` routes.
6. **ESLint:** Every import used. Apostrophes → `&apos;`. No unused route handler params.
7. **steps dual-shape:** `recipe.steps_v2 ?? recipe.steps` everywhere.
8. **`getAnonId()` client-side only:** localStorage unavailable on server.
9. **Recipe bank starts empty:** generate-v2 must work with zero recipes rows.
10. **No macros:** No protein_g/carbs_g in meals table. No macro UI in Phase 1 anywhere.
11. **Staggered skeleton animation:** `style={{ animationDelay: \`${i * 80}ms\` }}` not Tailwind delay-*.
