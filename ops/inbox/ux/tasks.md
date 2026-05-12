# UX inbox — task queue
# Agents read this at session start and process in order
# Format: - [ ] TASK: [description] | Priority: [HIGH/MED/LOW] | From: [source]
# Ordering: aligned to engineering build stages — complete UX work before the corresponding stage starts

---

## BEFORE STAGE 1 (bug fixes)

- [x] UX-002: Fix home card CTA labels — done: 2026-05-11 | agent: frontend-engineer
  - "Let's cook" (primary, terra) → /cook/[id] ✓
  - "View full recipe" (secondary, white/20) → /recipes/[id] ✓ (was "Full plan" → /planner)

---

## BEFORE STAGE 3 (recipe bank import — FEAT-002)

- [x] UX-013: Design "Add recipe" import modal | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (implemented in components/ImportRecipeModal.tsx)
  - Fields (in order): recipe name (required) · recipe type chips — Main / Side / Salad / Complete meal (required, single-select) · meal occasion chips — Breakfast / Brunch / Lunch / Dinner / Any (multi-select, default: Any) · source URL (optional, labelled "Paste a link — Instagram, YouTube, anywhere") · paste area (required, large, no limit)
  - Tone: warm, not form-like. Paste area placeholder: "Paste anything — a OneNote note, an Instagram caption, a YouTube description. Rasa reads this when building your plan."
  - Save button disabled until name + recipe type + paste text filled
  - On save: modal closes, toast "Added to your bank", recipe appears instantly

- [x] UX-019: Recipe bank empty state — post BUG-014 fix | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (implemented in app/recipes/page.tsx)
  - Empty state: spec'd copy + CTA opens import modal

- [x] UX-020: Recipe card visual updates for import | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (implemented in app/recipes/page.tsx)
  - "Yours" label on user-imported cards; ExternalLink icon when source_url set; Side/Salad type badge; meal_type badge (hides 'any')
  - AI-generated cards: no label, no icon — unchanged

---

## BEFORE STAGE 4 (meal types + planning form + home card — FEAT-001)

- [x] UX-016: Planning form redesign | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001a)
  - Current form: pantry + week context + use-soon (three fields, plain layout)
  - New form (top to bottom):
    1. "What are you cooking this week?" — meal type chips: [Breakfast] [Brunch] [Lunch] [Dinner] (multi-select; pre-selected from profile defaults)
    2. Days stepper per selected meal type (e.g. "Brunch — 5 days", "Dinner — 2 days")
    3. "What's in your fridge?" — pantry free text (existing)
    4. "Anything to use up?" — use-soon (existing)
    5. "Anything about this week?" — week context (existing)
  - Meal type chips + steppers appear above pantry — user frames the week before thinking about ingredients
  - Tone for new fields: same warm conversational register as existing fields
  - Deliverable: updated form field order + copy for new fields

- [x] UX-012: Planner — meal type sections + card variants | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001c)
  - Planner needs two labelled sections (prep-ahead meals first, then non-prep-ahead)
  - Prep-ahead card (e.g. brunch): primary text = meal name · subtitle = prep_ahead.tonight instruction · meta = assembly time · actions = [Swap] [Remove]
  - Non-prep-ahead card (e.g. dinner): primary text = meal name · subtitle = reasoning note · meta = cook time · actions = [Swap] [Remove]
  - Day-of variant for prep-ahead card: subtitle switches to prep_ahead.tomorrow ("assemble in X min") instead of tonight's prep
  - Cooked state: card shows meal name + ✓ cooked label; [Swap] and [Remove] hidden
  - "Rethink remaining" button: remove entirely
  - Deliverable: card component spec for both variants + section layout

- [x] UX-017: Home "What's Cooking" card — two states + three CTAs | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001d)
  - State A — active meal (not yet cooked):
    - For prep-ahead meal: title = meal name · subtitle = "Assemble in X min" (day-of) or "Prep tonight: [instruction]" (day-before)
    - For non-prep-ahead meal: title = meal name · subtitle = reasoning note · meta = cook time
    - CTAs: [Let's cook] (primary, terra) · [Swap] (secondary, outlined) · [Mark as cooked ✓] (ghost/text link)
  - State B — meal marked cooked; card rotates:
    - Priority 1: today's dinner (if planned) → show dinner card in State A
    - Priority 2: tomorrow's brunch prep → "Tomorrow: [Meal name]" · "Prep tonight: [instruction]" · [Mark prep done] (ghost)
    - Priority 3: nothing left → warm empty state ("You're all set for today. Check the planner for the rest of the week.")
  - Three-CTA layout: primary full-width on top; [Swap] + [Mark as cooked] side-by-side below (equal weight, smaller)
  - Deliverable: card state spec + CTA layout for both states

- [x] UX-014: Swap sheet — updated reasons + copy | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001c/d)
  - Current reasons: "Missing an ingredient / No time tonight / Something else" — replace entirely
  - New reasons (display order):
    1. "Forgot to prep" — only shown when swapping a prep-ahead meal type; hidden otherwise
    2. "No time right now" — copy: suggest quickest option available
    3. "Not feeling it" — copy: different flavour, same time budget
    4. "Missing an ingredient" — copy: free text field appears below to specify what's missing
  - Reason → AI instruction mapping (for backend):
    - "Forgot to prep" → zero-prep alternatives only; no recipe requiring advance work
    - "No time right now" → total time ≤ 20 min including all steps
    - "Not feeling it" → different cuisine or flavour profile; similar time budget
    - "Missing an ingredient" → plan around the specified missing item
  - Deliverable: updated swap sheet copy + reason list + mapping doc for backend

- [x] UX-015: Swap entry point on home card | Priority: HIGH | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001d)
  - [Swap] on home card opens same swap sheet as planner — no new UI, just a new trigger
  - Swap sheet must receive meal_type context from home card so it knows whether to show "Forgot to prep"
  - Deliverable: note to frontend that home card [Swap] passes meal_type to swap sheet

- [x] UX-018: Profile — "My cooking" section + health goals | Priority: MED | From: pm-agent 2026-05-11
  - done: 2026-05-11 | agent: frontend-engineer (FEAT-001e)
  - New section in profile (after existing preferences):
    - "Which meals do you cook at home?" — same chips as planning form (Breakfast/Brunch/Lunch/Dinner), multi-select
    - Per selected meal type: "Typical [X] days per week" — stepper
    - "Any health goals?" — chip suggestions: "High protein, balanced" · "Lighter meals" · "Family-friendly" · "Quick and simple"; also free text
  - Auto-save or single save button (consistent with existing profile pattern)
  - health_goals chip can be multi-select; stored as comma-joined text
  - Deliverable: section copy + field layout

---

## BEFORE STAGE 5 (bank-first generation — FEAT-003)

- [x] UX-004: Carb variety — prompt constraint spec | Priority: HIGH | From: pm-agent 2026-05-09
  - done: 2026-05-11 | resolved: constraint is invisible to user (FEAT-003 post-generation validation re-prompts once server-side; user sees streaming begin normally)
  - The re-prompt adds ~3-5s maximum — within BUG-009 streaming latency budget; no special loading copy needed

---

## Parked — not this sprint

- [ ] UX-001: Q2 onboarding error feedback | PARKED
- [ ] UX-003: /kitchen header rename to "What's Cooking" | PARKED
- [ ] UX-005: Q3 onboarding copy tone | PARKED
- [ ] UX-006: Shopping list empty state | PARKED
- [ ] UX-007: Measurement toggle default | PARKED
- [ ] UX-008: Swap flow reason reorder (old) | PARKED — replaced by UX-014
- [ ] UX-009: Spec plan reveal moment | PARKED
- [ ] UX-010: Mobile-responsive cook/recipe/shopping | PARKED
- [ ] UX-011: Recipe bank quality arc | PARKED
- [ ] Audit onboarding flow for friction | PARKED
- [ ] Review empty states across 5 tabs | PARKED — UX-019 covers recipe bank; rest parked
- [ ] Write copy variants for plan generation error messages | PARKED

## Processed
# - [x] [TASK]: [description] — done: [date] | agent: [who did it]
