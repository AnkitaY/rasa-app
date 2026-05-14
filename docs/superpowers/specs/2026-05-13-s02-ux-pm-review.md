# PM Review — S02 Feedback Sprint UX Specs
**Date:** 2026-05-13
**Reviewer:** pm-agent
**Specs reviewed:** UX-021, UX-022, UX-023, UX-024, UX-025, UX-026, UX-027, UX-028
**Status:** All 7 approved — changes noted per spec below

---

## Engineering Prerequisite (blocks UX-021, UX-022, UX-024)

A schema migration is required before any meal-type-aware spec can be built. This must land first.

**Required changes:**

| Target | Current | Required |
|---|---|---|
| `meals.meal_type` enum | `'brunch' \| 'dinner'` | `'breakfast' \| 'lunch' \| 'dinner'` |
| `user_preferences.brunch_days` column | exists | rename → `breakfast_days` |
| `user_preferences.lunch_days` column | missing | add |
| Existing `brunch` meal rows | in DB | migrate to `breakfast` |
| Plan engine prompt + API routes | hardcoded `'brunch'` strings | update to `'breakfast'` |

UX-021, UX-022, and UX-024 all use Breakfast / Lunch / Dinner as the three meal types. The DB must match before engineering starts on any of these specs.

---

## UX-021 — Day Selection Widget

**Verdict: Approved with spec note**

- All-ON default for week 1 is approved. Pre-fill from prior week kicks in from week 2+ as specced — this is the right tradeoff for a single-user app.
- Meal type labels in the spec (Breakfast / Lunch / Dinner) are correct. The `Bfast` column header abbreviation is approved. No change to spec text needed here — the DB migration (above) is the only action.

---

## UX-022 + UX-027 — Planner Day Layout + Empty Slot

**Verdict: Approved with CTA redesign**

The original 5-CTA layout (Start Cooking / See Recipe / Swap / Skip / Mark as Cooked as separate buttons) is replaced with the following pattern:

| Action | New treatment |
|---|---|
| See Recipe | Card tap (entire card is tappable) — no separate button |
| Skip | ✕ icon button, top-right corner of card, 26px pill, p1-cream background |
| Swap | ⇄ icon button, 38×38px, bordered (p1-border), same row as Start Cooking |
| Mark as Cooked | Checkbox, right of action row — label "Cooked" below (sizing + placement to be refined in full UI revamp) |
| Start Cooking | Unchanged — primary button, p1-terra, flex-1 in action row |

**Implementation note:** Action buttons (✕, ⇄, checkbox) must use `stopPropagation` so they don't trigger the card-tap-to-recipe navigation.

Everything else in UX-022 and UX-027 — day-first layout, p1-terra day headers, rest-day rows, cooked card state, in-place single-slot generation, dashed empty slot card — is approved as specced.

---

## UX-023 — Generation Loading Screen

**Verdict: Approved with one spec clarification**

Add the following explicit note to the "User navigates away during generation" edge case row:

> The "user must never see an empty Planner tab" rule applies to **automatic** navigation only (the 1.5s post-success auto-nav will not fire until all slots reach State 3). If the user **manually** navigates to the Planner tab mid-generation via the bottom nav, they may see a partial plan — this is acceptable because it is a user-initiated action.

Everything else — 3-state streaming rows, rotating copy every 4s, 1.5s auto-nav delay, partial-success inline error with "Continue with what we have" fallback, no manual "Go to Planner" button — is approved as specced.

---

## UX-024 — Home Today Card

**Verdict: Approved as specced**

All 8 scenarios are in scope for S02. The time-of-day hero logic, tomorrow preview (4 sub-states), afternoon "Did you make breakfast?" nudge, and Sunday evening planning nudge are all approved.

No changes to spec.

---

## UX-025 — Planner Visual Refresh

**Verdict: Approved with two token corrections**

**Correction 1 — p1-terra-lt note:**
Remove the phrase "reserved for form selected chips" from the p1-terra-lt token row. Selected chips (confirmed in UX-026) use **p1-terra** (#C4522A, solid), not p1-terra-lt. p1-terra-lt has no confirmed use case in S02 — the note is misleading.

**Correction 2 — p1-border-lt naming:**
UX-028 uses `p1-border-lt` with hex `#EDE0D0` for the divider above the Prep Ahead section. This is the same hex as `p1-surface`. Engineering should reference `p1-surface` — `p1-border-lt` is not a defined design system token and should not be introduced.

All other token definitions and typography specs in UX-025 are approved.

---

## UX-026 — Onboarding Q1 Dietary

**Verdict: Approved with one chip addition**

**Add "No red meat" as a 7th chip:**
- Display label: `No red meat`
- Stored value: `no_red_meat`
- Position: after Nut-free in the chip list

**Add "No raw fish" as an 8th chip:**
- Display label: `No raw fish`
- Stored value: `no_raw_fish`
- Position: after No red meat in the chip list

Rationale: the founder's household does not eat red meat, processed meats, or raw fish. Both are standing rules that apply to every generated meal — concrete enough for the AI plan engine to act on reliably (no sushi, sashimi, ceviche, steak tartare, etc.).

**Processed food handling:** the founder's preference to avoid processed food is covered by:
1. The "Other" free-text field (e.g. "no processed meats, packaged sauces")
2. Recipe bank curation — since all recipes are founder-imported, the inputs are already controlled

No additional chip for processed food needed.

Everything else — positive reframe, Playfair Display heading, nothing pre-selected, 0 selections = valid, free-text "Anything else?" field, Skip option — is approved as specced.

---

## UX-028 — Recipe Prep Section

**Verdict: Approved as specced**

Show-only-if-populated logic, placement (below ingredients / above method), warm intro line ("Do this tonight and tomorrow morning takes X minutes."), numbered steps for multi-step prep, assembly time line — all approved.

**Token note:** The `p1-border-lt` reference in this spec should be read as `p1-surface` by engineering (see UX-025 Correction 2 above). No change to the visual design — same hex, just the correct token name.

---

## Summary of Actions for UX-Agent

The following spec updates are needed before engineering handoff:

| Spec | Update needed |
|---|---|
| UX-022 | Replace 5-CTA section with revised interaction table (above) |
| UX-023 | Add clarification to "navigates away" edge case row |
| UX-025 | Remove p1-terra-lt "reserved" note; note p1-border-lt = p1-surface |
| UX-026 | Add "No red meat" as 7th chip (value: `no_red_meat`) |

UX-021, UX-024, UX-028 require no spec edits.
