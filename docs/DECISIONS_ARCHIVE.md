# Decisions Archive — Rasa
# Never auto-loaded. Reference only when historical context is needed.
# Current decisions → product.context.md decisions log
# Owner: Founder

---

## How this file works
When a decision in `product.context.md` is older than the rolling window (last 5),
it graduates here. Decisions that have been implemented and become settled facts
are also archived here rather than kept in the active log.

Format: newest at top.

---

## Archived decisions

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2026-05-11 | No carb variety constraint in generate-v2 prompt | Founder plans mains via AI and handles variety herself by browsing sides in the recipe bank. A hard carb constraint causes unnecessary AI self-correction and doesn't match her actual use case. Do not re-add this constraint. | Settled |
| 2026-05-11 | prep_ahead is a per-user, per-meal-type setting (meal_prefs JSONB) — not hardwired to brunch | Any meal type can be prep-ahead depending on the user's cooking pattern. Hardwiring brunch=prep_ahead would break for users who batch-prep dinners or don't prep brunch. meal_prefs defaults reflect the Phase 1 founder's pattern but the model is fully extensible. | Active — in implementation |
| 2026-05-11 | "Rethink remaining" removed from Phase 1 | Real mid-week use cases are: swap one meal (existing) or remove a slot for eating out (new, no AI). Rethink remaining requires pantry re-entry and solves a scenario that doesn't exist in the founder's actual cooking pattern. Was built from instinct, not a validated use case. | Active — removed from sprint |
| 2026-05-11 | "Forgot to prep" added as a swap reason; no "prep done" tracking state | App can't know if prep happened — adding a prep_done flag creates a daily marking interaction the user will forget, making the flag unreliable. Recovery path instead: Swap with "Forgot to prep" reason → AI returns zero-prep alternatives only. Frictionless, no new state. | Active — in implementation |
| 2026-05-11 | Swap CTA lives on home card (not just planner) | "Forgot to prep" recovery at 8am must not require navigating to the planner. Three CTAs on home card: Let's cook / Swap / Mark as cooked. Same swap sheet as planner — no new UI. | Active — in implementation |
| 2026-05-11 | "Mark as cooked" lives on the home card, not just the planner | Without it, the What's Cooking card can't rotate to the next priority (dinner / tomorrow's prep). Burying it in the planner means stale cards and broken home screen state. One tap from home is the fix. | Active — in implementation |
| 2026-05-11 | source_url added to recipe import (display only, not parsed) | Founder workflow: see recipe on Instagram, paste text + save the link for reference while cooking. One field, zero logic change. Not fetched or scraped — stored as-is, shown as link icon. | Active — in implementation |
| 2026-05-11 | Recipe bank filtering by recipe_type (Main/Side/Salad/Complete meal) | Enables "browse for a side while cooking the main" without touching the planner or shopping list. Sides and Salads are excluded from plan generation candidate list — they're browse-only references. | Active — in implementation |
| 2026-05-11 | Meal types are selectable chips (Breakfast/Brunch/Lunch/Dinner), not hardcoded brunch+dinner | Households have 3 meals; hardcoding brunch+dinner would require a redesign when the next user has a different pattern. Chip selector costs zero extra complexity and generalises correctly from day one. | Active — in implementation |
| 2026-05-11 | User-specified recipe pairings via "Serve with" note (not AI-only) | Founder imports component recipes (e.g. Garlic Beans) that pair with different mains each week. AI-only Serve With suggestions are too generic. User can type their own pairing; stored as serves_with_note. Planner shows both as one meal unit. Phase 2: proper recipe linking. | Active — in implementation |
| 2026-05-11 | Brunch is Phase 1 primary meal type (not Phase 2) | Founder cooks brunch 5–6x/week, dinner 2–3x/week. The app was built entirely around dinner. Wrong meal type = wrong product. Brunch elevated to first-class planning unit; dinner remains supported. | Active — in implementation |
| 2026-05-11 | Recipe bank text import is Phase 1 (reversed from Phase 2 deferral) | Bank-first plan generation is blocked without a recipe bank. Founder has 20–40 trusted recipes in OneNote/Instagram. Free-text paste is the minimum viable import — no URL parsing or structured data needed in Phase 1. | Active — in implementation |
| 2026-05-11 | Bank-first plan generation — AI plans from recipe bank, generates new only to fill gaps | Current generate-v2 invents recipes from scratch every week, ignoring the user's existing trusted repertoire. Bank-first means plans feel personal from day one, not generic. New recipes fill gaps where bank has no coverage (< 2 candidates per slot). | Active — in implementation |
| 2026-05-11 | Protein-first planning heuristic baked into generate-v2 | Founder's mental model: pick protein source first, then choose carbs and vegetables that complement it. Generation should mirror this — not assign meals then reverse-engineer macros. High protein, balanced diet is a hard planning constraint passed from health_goals field. | Active — in implementation |
| 2026-05-11 | Prep-ahead is the primary mode for brunch, not an optional field | Founder preps brunch the evening before; assembly next morning ≤ 30 min. The existing prep_ahead JSONB field was buried. Elevated to: required output for every brunch recipe, primary card action in planner. | Active — in implementation |
| 2026-05-11 | Planning can start any day of the week — not Sunday/Monday only | Founder or any future user may open the app mid-week (Tuesday, Thursday, any day). The app generates a plan for the remaining days of the current week, not a fixed Mon–Sun window. "Rest of the week from today" is the planning unit when mid-week. | Active — in implementation |
| 2026-05-11 | Sprint goal replaces sprint date — solo founder, async pace | The founder is the only human; agents work async. Date-bounded sprints create artificial pressure with no team to synchronise. Sprints are now defined by goal achievement, not calendar dates. | Active |
| 2026-05-11 | Phase 1 exit criteria rewritten as behavioral, not subjective | Replaced "8/10 rating", "planning rated 8/10+" with measurable behaviours: brunch cooked/assembled 5+ days in one week · 8+ recipes imported · 4+ meals/week for 2 consecutive weeks. Subjective ratings can't exit a phase. | Active |
| 2025 | Supabase over Firebase | Row Level Security, PostgreSQL familiarity, generous free tier | Implemented — settled |
| 2025 | "What's Cooking" replaces "Tonight's Kitchen" | Sessions happen any time of day; name must work for breakfast too | Implemented — settled |
| 2025 | Measurement toggle per-recipe, not global Profile setting | Same user uses cups for savory, grams for baking; global setting wrong half the time | Implemented — settled |
| 2025 | Serve With model over meal bundles for Phase 1 | Meal bundles require new data model and parallel cook mode — Phase 2 scope. Serve With covers Phase 1 need with one functional field. | Implemented — settled |
| 2025 | Remove macros/calories from all UI | Healthy by default; numbers create anxiety; other apps own tracking. Removed entirely, not replaced. | Implemented — settled |
| 2025 | Lock toggles removed from planner | Collaboration feature, irrelevant for single-user household in Phase 1 | Implemented — settled |
| 2025 | Session-based pantry over persistent inventory | Persistent DB requires constant maintenance, always stale. User already knows their fridge — just needs a prompt at plan time. | Implemented — settled |

---

## Superseded decisions
*Decisions that were made and then reversed or significantly changed.*

| Date | Original decision | What replaced it | Why changed |
|---|---|---|---|
| 2025 | Global measurement preference in Profile | Per-recipe toggle (Cups / Grams / Both) | Same user uses different systems for different recipe types — global setting was wrong half the time |
| 2025 | North star: WAU completing a 7-day plan | Meals actually cooked per week (4+) | Plans generated ≠ meals cooked. A plan that doesn't lead to cooking is not a win. Also: user likely cooks 4–5 nights, not 7. |
| 2025 | "Busy professionals" as target persona | Household with family (Priya) | Product was designed around household/family needs from the start — persona was a positioning phrase, not a real description |

---

## Experiments log
*Hypotheses tested, results, and what changed as a result.*

| Date | Hypothesis | Result | What changed |
|---|---|---|---|
| [DATE] | [If we X, users will Y] | [What actually happened] | [Decision made based on result] |