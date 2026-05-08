# Plan Engine — Rasa AI Generation Logic
# TOKEN BUDGET: 500 | Update: when AI logic or inputs change | Owner: Founder + ENG
# LOAD ALONGSIDE: product.context.md

---

## Input hierarchy — checked in this order

### Tier 1: Hard constraints (filter first, non-negotiable)
- Dietary rules & allergies — a plan violating these is worse than no plan
- Family composition — young kids = mild spice, familiar proteins, no unusual textures
- Banned ingredients ("never on the menu") — not allergies, just household no-gos

### Tier 2: Weekly session inputs (fresh every plan generation)
- **Pantry snapshot** — free text, units optional. AI treats unlabelled items as "available, unknown quantity." Plans around them without relying on precise measurements.
- **Week context** — conversational free text. "Busy Thursday, parents Saturday, lighter this week." AI extracts: busy nights, occasions, energy/mood, one-off constraints.
- **Use-soon items** — separate field. "Wilting spinach, sausages from last week." Highest AI priority — slots these into Mon/Tue meals before anything else. Plan reasoning must reference them: "Monday uses your sausages before they go off."

### Tier 3: Profile preferences (set once, applied every plan)
- Primary cuisine (60–70% of meals) + secondary cuisines (woven in for variety)
- Cooking skill level → complexity ceiling
- Weeknight time budget → per-day cook time constraint
- Meal goals (affordability / explorer / comfort) → plan character

### Tier 4: Recipe bank (compounds over time)
- Grows as byproduct of planning — not a prerequisite
- "Make again" rated recipes rotate back in every 3–4 weeks automatically
- "Won't make again" recipes retired from rotation (unless explicitly searched)

### Tier 5: Internal generation rules (invisible to user)
- Variety engine: no back-to-back same protein, cuisine mix across week, easy–hard effort rhythm
- One-pan and minimal-dishes variants preferred on weeknights (reduces cleanup)
- Reasoning surface: one-line explanation per meal shown inline on plan

## Generation order
```
1. Apply Tier 1 hard constraints
2. Prioritise use-soon items → slot to Mon/Tue
3. Parse week context → map busy nights, occasions, lighter days
4. Match primary cuisine (60–70%) + weave in secondary
5. Apply skill ceiling and weeknight time budget per day
6. Pull from recipe bank where available and appropriate
7. Apply variety engine (protein rotation, cuisine mix, effort rhythm)
8. Generate complete-meal recipes (see recipe completeness model below)
9. Generate one-line reasoning per meal
10. Auto-save generated recipes to recipe bank
```

**Output**: week plan with per-meal reasoning · recipes saved to bank · shopping gap list (including Serve With accompaniments)

## Recipe completeness model

### AI-generated recipes — always complete meals
Every AI-generated recipe must include protein + carb + vegetable in one recipe with steps timed to coordinate. Name as full meal, not single dish.
- ✓ "Dal Tadka with Basmati Rice and Cucumber Raita"
- ✕ "Dal Tadka"

Steps must be sequenced to account for parallel cooking: "put rice on first, make dal while it cooks, make raita in the idle minutes."

### User-imported and manually added recipes — may be single dish
At save time, AI detects completeness (does recipe include protein + carb + veg?). If a component is missing:
1. Pre-fill "Serve with" field with suggestion — editable, dismissable, one tap to accept
2. If accepted: accompaniment ingredients → shopping list when planned · planner shows "[Recipe] + [Accompaniment]" · cook mode shows persistent "Also make: X" note at top
3. If dismissed: no accompaniment added anywhere. No re-prompting. Valid choice.

AI skips the prompt for already-complete recipes (e.g. a chicken tray-bake with veg included).

## Feedback signals

### Active signals (explicit)
- **Family verdict**: "Everyone loved it" / "It was alright" / "Won't make again"
  - Shown in-app on next open after a meal is marked cooked (not immediately — family hasn't eaten yet)
  - Asked once per meal, never repeated if dismissed
  - "Make again" → weight up in future plans, rotate back in every 3–4 weeks
  - "Won't make again" → retired from rotation

### Passive signals (inferred, no user action)
- Meal swapped before cooking → mild dislike signal
- Meal planned, day passed, never cooked → skip signal
- Consistently skips same day (e.g. Fridays) → stop planning that day
- Cooks 4 of 7 planned meals every week → reduce plan to 4–5 meals

## Mid-week plan regeneration (Phase 1 — manual only)
User triggers manually ("Rethink remaining meals"). Regenerates uncooked meals only. **Constrained to current pantry — no new shopping implied.** AI prompt must not suggest ingredients outside what she currently has.

## What the engine never does
- Require units/quantities to generate a plan — "chicken" is enough
- Generate 7 meals if her cooking rhythm suggests 4–5
- Silently adjust the plan mid-week based on feedback (Phase 2)
- Suggest ingredients outside current pantry during mid-week regeneration
- Repeat the same protein on consecutive nights
- Ignore the use-soon field — if items are listed there, they appear in Mon/Tue meals

## Onboarding — first plan sequence
Three questions at launch (60 seconds total), then immediately to plan generation:
1. Dietary rules/allergies (hard constraints — cannot be skipped)
2. Who cooking for (family composition)
3. Primary cuisine (one) + secondary cuisines (optional taps)
→ Lands directly on pantry input → plan generated → recipe bank seeded with 5–7 entries