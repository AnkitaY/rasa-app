# Rasa — agent briefing
# TOKEN BUDGET: 350 | Last updated: 2026-05-07 | Stage: Phase 1 Bug Fix + Testing
# If this file is >14 days old, flag it before starting any task

## Identity
- Product: Rasa — AI-powered meal planning for busy professionals
- Repo: https://github.com/AnkitaY/rasa-app
- Deployed: https://rasa-app-woad.vercel.app/
- Stage: Phase 1 deployed, bugs being fixed, new features paused until stable
- North star metric: WAU completing a full 7-day meal plan
- Founded: 2025 | Users: pre-launch beta

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | Next.js 14.2.35 (App Router) + TypeScript |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Pre-auth anonymous — no login; identity via rasa_anon_id in localStorage |
| Styling | Tailwind CSS v3.4.1 + shadcn/ui base-nova + @base-ui/react |
| AI | @anthropic-ai/sdk — model: claude-sonnet-4-20250514 |
| Deployment | Vercel (auto-deploy from main branch) |
| CI/CD | GitHub Actions |
| State | Local useState — no global store |

## Hard rules (apply to every session, no exceptions)
- Never commit .env files or secrets to git
- Never hard-delete user data — soft delete only (deleted_at column)
- All DB queries through admin client in API routes — never directly in components
- Error format: `{ error: string, code: string, details?: object }`
- Never use `asChild` prop — @base-ui/react doesn't have it
- Never import from "shadcn/tailwind.css" — Tailwind v4 syntax, incompatible with this project
- Never query `.or('user_id.eq.null,...')` — use `.is('user_id', null)` instead
- getAnonId() is client-side only — never call in route handlers
- Always run `npm run build` before committing — ESLint runs at build time
- Feature branches only — nothing goes directly to main

## Context file map — load ONLY what the task needs
| Task type | Read these files |
|---|---|
| Product decisions / roadmap | docs/PRODUCT_CONTEXT.md + docs/METRICS_CONTEXT.md |
| UX review / copy / flows | docs/UX_CONTEXT.md + docs/BRAND_GUIDE.md |
| Any code work | docs/ENGINEERING_CONTEXT.md + SPRINT.md |
| Bug fixing | docs/ENGINEERING_CONTEXT.md + ops/inbox/engineering/tasks.md |
| Risk / irreversible decisions | docs/DECISION_FRAMEWORK.md |
| Brand / marketing content | docs/BRAND_GUIDE.md |

## Current state (Phase 1)
- Phase 1 deployed at https://rasa-app-woad.vercel.app/
- Phase 1 has known bugs — see ops/inbox/engineering/tasks.md
- DO NOT start new features until Phase 1 is stable
- All new features need a PRD in docs/prd/ before engineering starts
- Supabase project ID: hdzzmeeflrtccxupxzhn
- Vercel project: aikanshs-projects/rasa-app
