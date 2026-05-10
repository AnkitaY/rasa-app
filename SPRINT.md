# Active sprint
# TOKEN BUDGET: 200 | Overwrite each sprint — no history here, git has it

Sprint: S01 | Dates: 2026-05-07 → 2026-05-21
Goal: Fix all critical Phase 1 bugs and achieve basic test coverage

## In progress
(Moved from Ready when engineering starts)

## Ready (INVEST-complete — engineering can start)
# Add bugs/tasks here as you identify them. Example format:
# - [BUG-001] Describe the bug and expected vs actual behavior
#   AC: [ ] Criterion 1
#       [ ] Criterion 2
#   Branch: fix/bug-001-description

## Blocked
(Items that can't move until a decision is made)

## Needs founder decision
- [x] Define test framework to adopt → Vitest + RTL decided 2026-05-07 ✓
- [ ] Confirm Phase 2 scope before planning begins

## Done this sprint
- [x] BUG-001: Home/recipe detail direct Supabase queries — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-002: Shopping list leaks other user's data when anon_id missing — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-003: Regenerating plan orphans cooked meals — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-004: Planner auto-redirect on mark cooked — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-005: Recipe detail no BottomNav (stranded users) — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-006: Preferences save failure in production — done: 2026-05-07 | agent: backend-engineer
- [x] BUG-007: Recipe bank direct Supabase call — done: 2026-05-07 | agent: backend-engineer
- [x] FIX: Duplicate BottomNav on /recipes/[id] — BUG-005 fix was wrong (added nav to page; layout already renders it globally) — removed, deployed 2026-05-08
- [x] Test framework setup: Vitest + RTL — 25 unit/integration tests, 0 failures — done: 2026-05-08
- [x] Playwright E2E setup: 54 tests, 132/132 passing (chromium + mobile) — done: 2026-05-08
- [x] PR #2 reviewed, merged, deployed to production via Vercel CLI — done: 2026-05-08
