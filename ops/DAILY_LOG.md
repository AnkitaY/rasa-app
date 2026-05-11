# Daily agent log
# Agents append here at end of every session. Founder reads to stay current.
# Format: [DATE] [agent-name]: [task] → [done/blocked] | [1-line note]
# Archive to ops/metrics/LOG-[MONTH].md monthly to keep this file lean.

# Example entries:
# 2026-05-07 debug-agent: BUG-001 meal plan safari → done | fix in branch fix/bug-001-safari
# 2026-05-07 code-reviewer: reviewed fix/bug-001-safari → NEEDS_CHANGES | 1 issue filed in PR
2026-05-07 backend-engineer: BUG-002 shopping list anon_id guard → done | added 400 guard at top of POST /api/shopping/generate; npm run build ✓ (38/38 pages, no errors)
2026-05-07 frontend-engineer: BUG-001 direct Supabase calls in app/page.tsx + app/recipes/[id]/page.tsx → done | created GET /api/recipes/[id] (admin client); replaced both anon-key calls with fetch(); npm run build ✓ clean
2026-05-07 backend-engineer: BUG-003 regenerate orphans cooked meals → done | generate-v2 now updates existing week_plans row in place and deletes only uncooked meals; cooked days are preserved across re-generates; npm run build ✓ clean
2026-05-07 backend-engineer: BUG-004 planner auto-redirect on mark cooked → done | removed setTimeout router.push('/') from handleMarkCooked; toast fades naturally, user stays on planner
2026-05-07 backend-engineer: BUG-005 recipe detail no BottomNav → done | imported BottomNav, changed root div→main, added pb-24 clearance, BottomNav rendered at bottom
2026-05-07 backend-engineer: BUG-006 preferences save failure → done | getAnonId() now called at component mount (not inside submit handler) with empty-string guard; added console.error logging to all 500 paths in route — NOTE: if failures persist in prod, check Vercel SUPABASE_SERVICE_ROLE_KEY env var
2026-05-07 backend-engineer: BUG-007 recipe bank direct Supabase → done | created GET /api/recipes/list (admin client, anon_id required); replaced createClient() call in app/recipes/page.tsx with fetch(); npm run build ✓ (39/39 pages, clean)
2026-05-07 qa-agent: Phase 1 QA pass (9 flows) → done | 2 new HIGH bugs logged (BUG-006 preferences save failure in prod, BUG-007 recipe bank direct Supabase); flows 1-8 PASS on static audit; BUG-001/002/003 fixes verified
2026-05-07 backend-engineer: SOP updated — removed feature-branch requirement | CLAUDE.md + backend-engineer + frontend-engineer + lead-engineer + code-reviewer agents now commit directly to main; /review still required before every push
2026-05-07 backend-engineer: BUG-004/005/006/007 pushed to master (c8b7384) → Vercel deployed ✓ | https://rasa-app-woad.vercel.app/ responding 200
2026-05-08 backend-engineer: HOTFIX production DB permissions → done | GRANT ALL on user_preferences + meals to service_role; confirmed via REST 200 + POST /api/preferences/save returning {"ok":true}; root cause was Phase 1 tables created without service_role grants
2026-05-09 backend-engineer main IMP-001 — generate-v2 last_pantry_input now uses upsert so pantry pre-fill works even when preferences row is missing at generate time
2026-05-09 pm-agent: Phase 1 live E2E test (9/10 flows) → done | 7 new bugs (BUG-008 to BUG-014), 6 UX issues filed; TASKS.md backlog created; SPRINT.md Ready section updated; critical: cook mode unreachable (BUG-013) + recipe bank data leak (BUG-014) need immediate fix before founder testing
2026-05-10 frontend-engineer: BUG-008 Q1 onboarding Next button guard → done | added canProceed derived state; Next disabled until chip selected or free text entered; updated conflicting e2e test + added BUG-008 coverage; npm run build ✓ clean
