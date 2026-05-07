# Engineering context
# TOKEN BUDGET: 500 | Update: per architecture change | Owner: Founder/Tech
# Load only for code tasks. Not needed in PM/UX/marketing sessions.

## Stack details
| Component | Tech | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 14.2.35 | App Router (not Pages Router) |
| Language | TypeScript | ^5 | Strict mode enabled |
| Database | Supabase / PostgreSQL | @supabase/supabase-js 2.105.1 | Row Level Security enabled |
| DB Client | Supabase JS SDK | @supabase/ssr 0.10.2 | No ORM — raw Supabase queries |
| Styling | Tailwind CSS | ^3.4.1 | p1-* tokens for Phase 1; rasa-* tokens for Phase 0 |
| UI Components | shadcn/ui (base-nova) + @base-ui/react | 4.6.0 / ^1.4.1 | No asChild prop; no Tailwind v4 imports |
| AI | @anthropic-ai/sdk | ^0.92.0 | Model: claude-sonnet-4-20250514 |
| Icons | lucide-react | ^1.14.0 | |
| Auth | Pre-auth anonymous | — | rasa_anon_id in localStorage; user_id IS NULL in all rows |
| Deployment | Vercel | — | Auto-deploy from main branch |
| Testing | Not yet set up | — | Recommended: Vitest + React Testing Library |

## Architecture decisions (ADRs)
| Date | Decision | Why | Tradeoff |
|---|---|---|---|
| 2025 | Next.js App Router over Pages Router | Modern paradigm, better server component support | Steeper learning curve, fewer community examples |
| 2025 | Pre-auth anonymous identity | Reduce onboarding friction, validate core loop first | Can't recover data if user clears localStorage |
| 2025 | Admin Supabase client for all API routes | Bypasses RLS safely in server context | Must ensure proper auth checks in route handlers |
| 2025 | No global state (no Redux/Zustand) | Simplicity; app state fits in local component state | Props drilling in deeper trees |

## Folder map (key directories)
| Path | Purpose |
|---|---|
| app/ | Next.js App Router — all routes and pages |
| app/api/ | API route handlers (server-side only) |
| app/components/ | Route-scoped reusable components (BottomNav, SwapSheet, etc.) |
| components/ui/ | shadcn/ui components — DO NOT edit manually |
| lib/ | Shared utilities (anon.ts, types.ts, utils.ts) |
| lib/supabase/ | Supabase client instances (client.ts, server.ts, admin.ts) |
| _archive/ | Old CLAUDE.md and retired files — do not reference in code |

## API conventions
- Endpoint format: /api/[resource] (current — not yet versioned to /api/v1/)
- Auth: anon_id passed in request body from client — validate on every route
- Errors: { error: string, code: string, details?: object }
- All user input validated at API boundary
- No pagination yet — all list endpoints return full results

## Database conventions
- All queries via createAdminClient() in API routes — never in components
- Soft delete: all user data uses deleted_at timestamp, never hard DELETE
- Supabase project ID: hdzzmeeflrtccxupxzhn
- Row Level Security: RLS should be on all user tables
- Day abbreviations in week plan slots: always 3-letter (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- week_plans.slots is a full GeneratedPlan object: { slots: PlanSlot[], daily_totals: [], batch_opportunities: [] }

## Known tech debt (do not touch without discussion)
| Item | Location | Risk if touched |
|---|---|---|
| Phase 0 features not linked from Phase 1 nav | app/inventory/, app/kitchen/ | Still functional; removing breaks direct-URL access |
| Legacy plan generator | app/api/plans/generate/ | Superseded by generate-v2 but kept for reference |
| Phase 0 rasa-* CSS tokens | app/globals.css | Used by Kitchen feature; renaming breaks Phase 0 pages |

## Phase 1 known issues
See ops/inbox/engineering/tasks.md for the full bug list.
- [FILL IN — summarize 2-3 critical bugs once identified through testing]
