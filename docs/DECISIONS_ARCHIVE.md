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