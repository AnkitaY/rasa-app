# Product context
# TOKEN BUDGET: 500 | Update: every Friday | Owner: Founder

## Current state
- Users: pre-launch beta | Active WAU: [FILL IN — check analytics] | PMF signal: None yet
- Phase 1 deployed: https://rasa-app-woad.vercel.app/
- Core loop: Land on app → Complete onboarding (dietary rules, who cooking for, cuisine) → Generate 7-day meal plan → View shopping list
- Biggest drop-off: [FILL IN — check analytics where users leave]
- Last validated learning: [FILL IN — what your last experiment proved or disproved]

## Personas
| Persona | Job to be done | Core pain | Usage freq |
|---|---|---|---|
| Busy Priya | Plan healthy meals for family without spending Sunday thinking | Too many decisions, different dietary needs | Weekly |
| Solo Sam | Eat varied, avoid waste, spend less | Buys ingredients, uses half, wastes rest | Weekly |
| [Add 3rd persona if identified] | | | |

## Phase roadmap
| Phase | Status | Summary |
|---|---|---|
| Phase 0 | Shipped | Inventory management, kitchen prep assistant ("Tonight's Kitchen"), recipe generation via Claude AI, legacy meal planner |
| Phase 1 | Shipped — bugs | Onboarding (3-step: dietary rules → who cooking for → cuisine), preferences, V2 meal plan generation, planner V2 with SwapSheet, home V2 (hero + feedback + week strip), recipe detail V2 (steps_v2 + prep_ahead), URL recipe import, shopping list V2, profile editor |
| Phase 2 | Planned | [FILL IN — household members? grocery integration? auth?] |

## Active work (this quarter)
| # | Task | Hypothesis | Success metric | Status |
|---|---|---|---|---|
| 1 | Fix Phase 1 bugs | Bugs cause drop-off before first plan is created | 0 critical bugs | In progress |
| 2 | Phase 1 testing | Untested code has hidden bugs | >80% test coverage on service layer | Up next |
| 3 | [Next feature] | [If we X, users will Y] | [Metric] | Planned |

## NOT building (firm decisions)
- Calorie tracking: out of scope, other apps own this space
- Social sharing: not in target user behavior
- User authentication/login: pre-auth anonymous identity is the current model

## Decisions log (last 5)
| Date | Decision | Reason |
|---|---|---|
| 2025 | Supabase over Firebase | Row Level Security, PostgreSQL familiarity, generous free tier |
| 2025 | Pre-auth (no login) for Phase 1 | Reduce onboarding friction; validate core product before adding auth |
| 2025 | shadcn/ui base-nova theme | Modern component library with @base-ui/react primitives |
| [DATE] | [Decision made] | [Why] |
