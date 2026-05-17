# Active sprint
# TOKEN BUDGET: 200 | Detail lives in ops/sprints/SPRINT-recipe-import-2026-05-14.md — read that, not this

Sprint: S03 | recipe-import | 2026-05-14 → 2026-05-21
Goal: Free text recipe import end-to-end — paste, Haiku parse, review, save, duplicate detection

---

## Task checklist (execution order — do not reorder)

- [x] FEAT-S03-001-SPIKE — Haiku proof-of-concept: prove `claude-haiku-4-5-20251001` + `betas: ['prompt-caching-2024-07-31']` works with `@anthropic-ai/sdk ^0.92.0` (lead-engineer | S | 30 min timebox)
- [x] FEAT-S03-000 — DB migration: add `global_curated` to `recipes.source` check constraint + regen TypeScript types (backend-engineer | S)
- [x] FEAT-S03-001 — `POST /api/recipes/parse-text` — Haiku 4.5 parse + prompt caching [requires spike + FEAT-S03-000] (backend-engineer | M)
- [x] FEAT-S03-005 — `POST /api/recipes/import-parsed` — duplicate detection, name suggestion, DB write [requires FEAT-S03-000] (backend-engineer | S)
- [x] FEAT-S03-002 — Import screen UI at `/recipes/add/import` — single textarea + CTA + error states [requires FEAT-S03-001] (frontend-engineer | M)
- [x] FEAT-S03-003 — Review screen UI at `/recipes/import/review` — editable name, meal type chips, collapsed lists [requires FEAT-S03-001 + FEAT-S03-005] (frontend-engineer | L)
- [x] FEAT-S03-004 — `DuplicateNameSheet` bottom sheet component [requires FEAT-S03-005] (frontend-engineer | M)
- [x] FEAT-S03-006 — Error states audit + save-success toast [requires all prior tasks] (lead-engineer | S)
- [x] FEAT-S03-007 — Wire "Import from text" entry point on recipe bank page to `/recipes/add/import` [requires FEAT-S03-002] (frontend-engineer | S)

---

## In progress

## Ready

## Done this sprint

- [x] FEAT-S02-000 — Schema migration (brunch→breakfast, add lunch) — 2026-05-13
- [x] FEAT-S02-001 — Day Selection Widget (UX-021) — 2026-05-13
- [x] FEAT-S02-002 — Planner day-first layout + visual refresh + empty slot (UX-022, 025, 027) — 2026-05-13
- [x] FEAT-S02-003 — Generation loading screen + streaming (UX-023 + BUG-009) — 2026-05-13
- [x] FEAT-S02-004 — Home Today Card (UX-024) — 2026-05-13
- [x] FEAT-S02-005 — Onboarding Q1 dietary refresh (UX-026) — 2026-05-13
- [x] FEAT-S02-006 — Recipe detail prep section (UX-028) — 2026-05-13
- [x] FEAT-S02-007 — Recipe bank import + browsing (FEAT-002) — 2026-05-13
- [x] FEAT-S02-008 — Bank-first generation + protein-first prompt (FEAT-003) — 2026-05-13
- [x] BUG-013 — Cook mode routing — 2026-05-13
- [x] BUG-014 — Recipe bank cross-user data leak — 2026-05-11
- [x] BUG-001 through BUG-008 — S01 carryover bugs — 2026-05-07/10
- [x] Test framework — Vitest + RTL + Playwright — 2026-05-08

## Parked

- BUG-010: Cook time missing from planner cards
- BUG-011: Stale reasoning note after swap
- BUG-012: Week strip day tap routing
- FEAT-005: Learning loop / Won't make again exclusion (Phase 2)
- 80% service layer test coverage
- Profile screen (ENG-PRD-005)
- Mid-week regeneration (PM-010)
- Recipe identity dedup (PM-011)
