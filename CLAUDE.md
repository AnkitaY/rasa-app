# Rasa — Agent Briefing
# TOKEN BUDGET: 350 | Last updated: 2026-05-07 | Stage: Phase 1 Bug Fix + Testing
# If this file is >14 days old, flag it before starting any task

---

## Current State
- Phase: Phase 1 — single user (founder), browser-based app, household with family
- Deployed: https://rasa-app-woad.vercel.app/
- Repo: https://github.com/AnkitaY/rasa-app
- Supabase project ID: hdzzmeeflrtccxupxzhn
- Vercel project: aikanshs-projects/rasa-app
- Status: Bug fix + testing — DO NOT start new features until Phase 1 is stable
- Current blocker: ["Test cases not yet written by test-engineer agent"]
- All new features need a PRD in docs/prd/ before engineering starts

### Phase 1 exit criteria
- First plan generated in <90 seconds from cold start
- 4+ meals cooked per week for 2 consecutive weeks
- At least one "Everyone loved it" rating in week 1
- Planning experience rated 8/10+

---

## Identity & Product

- **Product:** Rasa — a home cooking companion, not a meal planner. Handles the full weekly loop: planning → shopping → cooking → feeling proud.
- **Philosophy:** Healthy by default. No calorie or macro tracking, ever. The app does the thinking so the user doesn't have to. Tone throughout is warm and conversational — a trusted friend who happens to know a lot about cooking.
- **North star metric:** Meals actually cooked per week (target: 4+ per week, sustained over 2 consecutive weeks). Not plans generated — a plan that doesn't lead to cooking is not a win.
- **Supporting signal:** Post-dinner family verdict ("Everyone loved it" / "It was alright" / "Won't make again") — ground truth on whether the plan is working for the household.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14.2.35 (App Router) + TypeScript | |
| Backend | Next.js API Routes | |
| Database | Supabase (PostgreSQL) | |
| Auth | Pre-auth anonymous — no login; identity via `rasa_anon_id` in localStorage | No auth layer; anon ID is the only user identity signal |
| Styling | Tailwind CSS v3.4.1 + shadcn/ui base-nova + @base-ui/react | [PLACEHOLDER — why @base-ui alongside shadcn? e.g. "base-ui used for X because shadcn's asChild pattern is incompatible"] |
| AI | @anthropic-ai/sdk — model: `claude-sonnet-4-20250514` | |
| Deployment | Vercel — deployed explicitly via Vercel MCP after each push to `main` (do not rely on git auto-deploy) | |
| CI/CD | GitHub Actions | |
| State | Local useState — no global store | Intentional for Phase 1 simplicity — revisit at Phase 2 |

---

## Hard Rules

### Data integrity
- Never hard-delete user data — soft delete only (`deleted_at` column)
- All DB queries through admin client in API routes — never directly in components
- Before any Supabase schema change: read existing migrations in `supabase/migrations/`, then state the migration name + SQL before writing any code
- Error format: `{ error: string, code: string, details?: object }`

### Frontend / components
- Never use `asChild` prop — @base-ui/react doesn't support it
- Never import from `"shadcn/tailwind.css"` — Tailwind v4 syntax, incompatible with this project
- `getAnonId()` is client-side only — never call in route handlers

### Database queries
- Never query `.or('user_id.eq.null,...')` — use `.is('user_id', null)` instead

### Git / deploy
- Never commit `.env` files or secrets to git
- **Single default branch: `main`.** There is no `master` branch — it was removed 2026-05-20. Always commit and push to `main`. If any doc or script still says `master`, fix it.
- Commit directly to `main` — run `/review` and fix all issues before pushing
- Always run `npm run build` before committing — ESLint runs at build time
- Push: `git push origin main` (or just `git push` since upstream is set)
- **After every push, deploy to production via the Vercel CLI, then verify via the Vercel MCP. Do NOT rely on Vercel git auto-deploy** — Vercel's git integration is wired to a different account and our production-branch setting cannot currently be moved to `main`, so the auto-deploy is effectively dead. The CLI is the real trigger.
  - Project IDs (also in `.vercel/project.json`): projectId `prj_YELCx2DVLax2jF7uBpKdUMa6cB53`, teamId `team_qxqbzAOXJAk0aoe5N3qlfy7q`.
  1. **Trigger:** `npx vercel --prod --scope aikanshs-projects` — wait for the command to print `✅  Production: https://...vercel.app`. (`deploy_to_vercel` MCP is advisory only and does not actually deploy.)
  2. **Verify:** `mcp__d78263c1-b554-43fc-a71e-9efdfd29bc00__list_deployments` — find the deployment that matches the CLI-printed URL or your latest commit SHA.
  3. Poll `mcp__d78263c1-b554-43fc-a71e-9efdfd29bc00__get_deployment` until `readyState` = `READY`.
  4. On `ERROR` / `CANCELED`: `get_deployment_build_logs`, surface failure, do not mark task done.
  5. If MCP returns 403: the Vercel auth scope expired — reconnect the Vercel MCP. Fallback: `curl -sI https://rasa-app-woad.vercel.app/` returns 200 AND the new content renders.
  6. Confirm https://rasa-app-woad.vercel.app/ serves the new build.

### Repo-level operating constraints
- If `SPRINT.md` and `ops/inbox/engineering/tasks.md` conflict, stop and ask — don't assume
- Never modify files outside task scope without flagging it first

---

## Context File Map — load ONLY what the task needs

| Task type | Read these files |
|---|---|
| Product decisions / roadmap | `docs/PRODUCT_CONTEXT.md` + `docs/METRICS_CONTEXT.md` |
| UX review / copy / flows | `docs/UX_CONTEXT.md` + `docs/BRAND_GUIDE.md` |
| Any code work | `docs/ENGINEERING_CONTEXT.md` + `SPRINT.md` |
| Bug fixing | `docs/ENGINEERING_CONTEXT.md` + `ops/inbox/engineering/tasks.md` |
| Database / schema changes | `supabase/migrations/` + `docs/ENGINEERING_CONTEXT.md` |
| Risk / irreversible decisions | `docs/DECISION_FRAMEWORK.md` |
| Brand / marketing content | `docs/BRAND_GUIDE.md` |