# Quality Check — S02 Generation Quality (ENG-PRD-001)
**Date:** 2026-05-11 | **Agent:** test-engineer | **Task:** ENG-PRD-001
**Scope:** 20 pantry inputs through generate-v2 prompt — 10 brunch, 10 dinner

---

## Summary

| | Passed | Failed | Score |
|---|---|---|---|
| Brunch | 6 | 4 | 60% |
| Dinner | 3 | 7 | 30% |
| **Total** | **9** | **11** | **45%** |

**Not ready to ship. Prompt fix applied — recheck recommended before founder use.**

---

## Test Matrix

### Brunch (10 tests — meal_type: brunch, 5 slots, prep_ahead required)

| ID | Pantry summary | prep_ahead.tonight | assembly_time_mins ≤ 30 | protein_source | no consec. protein | carb base ≤ 2x | shopping list | Result |
|---|---|---|---|---|---|---|---|---|
| B01 | paneer 400g, eggs, moong dal, spinach | ✓ | ✓ | ✓ | ✓ | ✗ roti ×3 | ✓ | **FAIL** |
| B02 | eggs, oats, banana, milk, almonds | ✓ | ✓ | ✓ | ✓ | ✗ oats ×3 | ✓ | **FAIL** |
| B03 | wholegrain bread, eggs, tomatoes, cheddar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| B04 | Greek yoghurt, mango, granola, chia, nuts | ✓ | ✓ | ✓ | ✗ yogurt ×4 days | ✗ granola ×5 | ✓ | **FAIL** |
| B05 | paneer 200g, wholewheat flour, methi, ghee | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| B06 | chicken mince, eggs, spring onions, soy sauce | ✓ | ✓ | ✓ | ✓ | ✗ paratha ×3 | ✓ | **FAIL** |
| B07 | firm tofu, eggs, bell peppers, mushrooms, tamari | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| B08 | moong dal, carrots, cumin, rice flour | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| B09 | chickpea flour, onion, spinach, yoghurt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| B10 | eggs, paneer 150g, wholewheat flour, coriander | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |

**Brunch-specific checks summary:**
- `prep_ahead.tonight` populated: **10/10** — no failures
- `assembly_time_mins ≤ 30`: **10/10** — no failures
- Clear protein source: **10/10** — no failures

### Dinner (10 tests — meal_type: dinner, 5 slots, no prep_ahead requirement)

| ID | Pantry summary | is_complete_meal | steps ≥ 3 | protein_source | no consec. protein | carb base ≤ 2x | shopping list | Result |
|---|---|---|---|---|---|---|---|---|
| D01 | chicken thighs 500g, basmati rice, spinach, masala | ✓ | ✓ | ✓ | ✓ | ✗ rice ×4 | ✓ | **FAIL** |
| D02 | salmon 400g, baby potatoes, broccoli, dill | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| D03 | paneer 400g, chickpeas, tomatoes, spinach | ✓ | ✓ | ✓ | ✓ | ✗ rice ×3 | ✓ | **FAIL** |
| D04 | lamb mince, courgettes, feta, pita, yoghurt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| D05 | red lentils, carrots, celery, smoked paprika | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| D06 | firm tofu, soba noodles, bok choy, miso | ✓ | ✓ | ✓ | ✓ | ✗ rice ×3 | ✓ | **FAIL** |
| D07 | eggs 6, potatoes 500g, bell peppers, paprika | ✓ | ✓ | ✓ | ✓ | ✗ rice ×3 | ✓ | **FAIL** |
| D08 | pork mince, jasmine rice, spring onions, fish sauce | ✓ | ✓ | ✓ | ✓ | ✗ rice ×3 | ✓ | **FAIL** |
| D09 | chicken breast, penne, sun-dried tomatoes, parmesan | ✓ | ✓ | ✓ | ✓ | ✗ rice ×3 | ✓ | **FAIL** |
| D10 | beef strips 400g, basmati rice, yoghurt, garam masala | ✓ | ✓ | ✓ | ✓ | ✗ rice ×4 | ✓ | **FAIL** |

**Dinner-specific checks summary:**
- `is_complete_meal = true`: **10/10** — no failures
- Steps coherent (≥ 3 steps_v2): **10/10** — no failures
- Clear protein source: **10/10** — no failures

---

## Failure Analysis

### SYSTEMATIC — Carb base repeated 3+ times: 11/20 (55%)

The AI consistently defaults to the "primary cuisine" carb (rice for Indian; roti/paratha for Indian brunch; granola for Western brunch) without counting carb repetition before outputting. In dinner, rice appeared 3–4 times in 7/10 cases. In brunch, roti/oats/paratha repeated in 3/4 failures.

**Root cause:** The carb variety constraint was rule #3 in the user prompt's numbered list — a position the model deprioritises when the obvious carb matches the pantry and cuisine. The model was not instructed to self-audit its carb_base values before outputting.

**Affected pantries:** Most severe when the pantry contains a single dominant carb staple (basmati rice, oats, granola) and the cuisine defaulted to Indian.

**Edge case note (B04):** The yoghurt/granola/mango pantry had no viable alternative carb for 5 brunch slots. This is a pantry limitation, not a prompt failure. The validation system catches it correctly via re-prompt.

### Non-systematic — Consecutive same protein: 1/20 real cases (B04 only)

B04's granola/yoghurt pantry forced yoghurt as the only protein across all 5 brunch slots. This is the same pantry-limitation edge case as above. Validation catches and re-prompts.

### Bank-first usage: Not testable in isolation

Tests were run without a seeded recipe bank (empty candidateBlock), matching the new-user experience. Bank-first logic in the route is structurally correct (verified by code review) — it is exercised only when recipes exist. This check is deferred to a live integration test once the founder has seeded her bank.

---

## Fix Applied

**File:** [`app/api/plans/generate-v2/route.ts`](../app/api/plans/generate-v2/route.ts) — system prompt, line ~458

Added the following paragraph to the end of the system prompt (after the pantry quantities rule):

```
CARB VARIETY (hard constraint): Before returning your response, count how many times
each carb_base value appears across all meals. No single carb_base (e.g. "rice",
"roti", "oats", "bread", "granola", "pasta") may appear in more than 2 meals in the
same plan. If any carb_base appears 3 or more times, revise those later meals to use
a different carbohydrate — choose from alternatives that complement the protein and
cuisine. This check is mandatory and must be done before you output the JSON.
```

This makes carb variety a hard constraint in the system prompt — at the same priority level as the health goals constraint — rather than a buried numbered rule in the user prompt. The explicit self-audit instruction ("count how many times each carb_base value appears... before you output the JSON") is the key addition.

**Build:** `npm run build` passes cleanly after the change.

---

## Secondary Finding — Model deprecation

The route uses `claude-sonnet-4-20250514` which is flagged as deprecated (EOL June 15, 2026). Recommend updating to `claude-sonnet-4-6` before the EOL date. Both stream() call and non-streaming re-prompt call need updating.

Files: [`app/api/plans/generate-v2/route.ts`](../app/api/plans/generate-v2/route.ts) lines 537 and 580.

**Fixed 2026-05-11 by pm-agent:** Both model references updated to `claude-sonnet-4-6`. Build passes.

---

## Recommended Next Steps

1. **Re-run this quality check** after prompt fix is in production — target ≥ 16/20 pass rate before founder use
2. **Update model** from `claude-sonnet-4-20250514` → `claude-sonnet-4-6` (deprecated June 2026)
3. **FEAT-001b**: Once rolling planning window is live, re-test brunch with real prep_ahead validation end-to-end through the route (not just prompt-level)
4. **Bank-first integration test**: Once founder has seeded bank (10+ recipes), verify bank recipes are actually selected by running a plan with a known pantry that matches a bank recipe

---

## Test Methodology

- 20 Claude API calls using the identical system + user prompt from `generate-v2/route.ts`
- No Supabase calls — empty bank (new-user scenario), default preferences (`high protein, balanced`)
- Model: `claude-sonnet-4-20250514` — same model as route
- Tool: [`scripts/quality-check-s02.mjs`](../scripts/quality-check-s02.mjs), [`scripts/quality-check-retry.mjs`](../scripts/quality-check-retry.mjs)
- Results: [`scripts/quality-check-results.json`](../scripts/quality-check-results.json)
