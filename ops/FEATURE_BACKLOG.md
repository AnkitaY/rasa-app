# Rasa — Feature Backlog
# Generated: 2026-05-09 | Source: PM agent live testing against Phase 1 PRD
# Update this file as items move between phases or get resolved.

---

## Phase 1 Must-Have
_Required for Phase 1 exit criteria, directly specified in Phase 1 PRD scope, or blocking the core weekly loop._

- [ ] **[BUG-013] Cook mode routing** — "Let's cook" from home + recipe detail must enter step-by-step cook mode carousel. Currently unreachable from any entry point. Cook mode is a preserved Phase 0 feature per PRD. `CRITICAL`
  - Entry: home hero card "Let's cook" → cook mode; recipe detail "Let's cook" → cook mode
  - Out of scope: adding new cook mode features — just fix the routing

- [ ] **[BUG-014] Recipe bank data scoping** — Fresh session shows 47 test/seed recipes. Must show empty bank until user's plan generates or they import. `CRITICAL`
  - Fix API route filter + remove null-user_id seed rows from production DB

- [ ] **[BUG-008] Q1 onboarding validation** — Dietary restrictions step can be skipped. PRD: Q1 cannot be skipped; "None" must be explicitly chosen. `HIGH`

- [ ] **[BUG-009] Plan generation speed** — Target <15s; currently ~25s. Streaming response to show plan tokens as they arrive. `HIGH`

- [ ] **[UX-004] Meal variety — carb diversity** — All 7 generated meals used rice. Add prompt constraint: max 2 meals sharing same carb base in a 7-meal plan. `HIGH`

- [ ] **[BUG-010] Cook time on planner cards** — PRD specifies meal name + cook time + reasoning on every planner card. Cook time currently missing from main card view. `MED`

- [ ] **[BUG-011] Stale reasoning note after swap** — Post-swap, new meal name shows but old reasoning note persists. `MED`

- [ ] **[UX-002] CTA label alignment** — Home hero secondary CTA reads "Full plan" (routes to planner). PRD spec: "View full recipe" (routes to recipe detail). `MED`

- [ ] **[UX-003] "What's Cooking" rename** — /kitchen page header still reads "Tonight's Kitchen". PRD renamed this to "What's Cooking". `LOW`

- [ ] **[UX-001] Q2 onboarding error feedback** — Blocking step shows no message when Next tapped with nothing selected. Add inline "Pick one to continue" hint. `LOW`

- [ ] **[Feedback prompt]** — Post-meal rating card ("How did [Meal] land last night?") — not present in current build. Required for Phase 1 exit criteria ("Everyone loved it" signal). `HIGH`
  - Spec: 3-tap card (not modal), shown on next home visit after marking a meal cooked, dismissable, shown once per meal

---

## Phase 2
_Explicitly deferred in PRD or depends on Phase 1 feedback signals before scoping. Do not start until Phase 1 exit criteria met._

- [ ] **Recipe user import** — Paste URL or type recipe name → parsed and saved to recipe bank. (FEAT-P2-001)

- [ ] **"Serve with" pairing for single-dish imports** — When user imports a protein-only recipe, suggest a side. Depends on import flow. (FEAT-P2-002)

- [ ] **Feedback → plan learning loop** — "Won't make again" excluded from future plans; "loved it" weighted up. Requires 2 weeks of signal data first. (FEAT-P2-003)

- [ ] **Persistent pantry model** — Pantry persists between generate cycles; shopping list deducts from pantry. Spec needed before engineering starts. (FEAT-P2-004)

- [ ] **"Use soon" hard-priority placement** — Use-soon ingredients must appear in first 2 days of plan, not just best-effort. (FEAT-P2-005)

---

## Later
_Nice-to-have, low signal, or beyond Phase 2 scope. Revisit when Phase 2 is stable._

- [ ] **Multiple household profiles** — Two cook profiles (e.g. parent + partner) with different preferences on same anon session.

- [ ] **Calendar / grocery app integration** — Export shopping list to Instacart / Todoist / Apple Reminders.

- [ ] **Cuisine discovery mode** — "Surprise me" option that rotates primary cuisine each week.

- [ ] **Portion scaling** — Adjust meal quantities from planner (e.g. "make extra for lunch tomorrow").

- [ ] **Nutrition summary** — Optional, opt-in macro overview per week (no tracking, just awareness). Health-by-default principle must still hold.

---

## Unplanned
_Feature requests captured during testing. Not yet scoped or prioritised._

- [ ] **[UX-005] Add meals for a day from homepage** — When no meals are planned for a day, the home card says "Nothing planned today" with an "Add a meal" button. Tapping it goes to the planner, but the planner currently has no way to add meals to an individual day. The full flow needs to work end-to-end: home CTA → planner → add meal for that specific day.

---

## Observations (not bugs, not features — UX friction + delight notes)

1. **Onboarding felt fast and warm overall.** Q1 and Q2 copy hits the right tone — conversational, not form-like. Q3 cuisine grid is more UI-ish; a single framing line would help.

2. **Plan reasoning notes are genuinely useful.** Each meal card in the planner shows why the meal was chosen ("uses your spinach before it wilts"). This is a differentiator — keep it prominent, don't move it to a tooltip.

3. **Swap flow is smooth once you find it.** The 3-reason + inline alternatives pattern works well. The only friction: after swapping you land back on planner with a stale reasoning note (BUG-011).

4. **Profile screen pre-loads onboarding answers correctly.** Family/young kids and Indian cuisine were pre-populated from onboarding. Good — no re-entry required.

5. **47-recipe leak is jarring on first use.** A new user who hasn't generated a plan yet sees a full populated recipe bank. This is the most trust-damaging bug in the current build after cook mode being broken.

6. **No cold-start moment worth celebrating yet.** The plan generates and you're dropped into the planner — no "here's your week" moment. A simple transition or first-plan celebration could anchor the product's promise.
