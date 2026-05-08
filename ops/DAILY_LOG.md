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
