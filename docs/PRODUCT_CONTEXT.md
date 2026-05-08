# Product Context — Rasa
# TOKEN BUDGET: 600 | Update: every Friday | Owner: Founder
# SPECIALIST FILES: load alongside this file as needed → see ## File index

---

## Product identity
- **Rasa**: home cooking companion — not a meal planner. Full loop: plan → shop → cook → feel proud.
- **Philosophy**: Healthy by default. No calorie or macro tracking, ever. App does the thinking so user doesn't have to.
- **Tone**: Warm, conversational, trusted friend who knows food. Never clinical. → see `DESIGN_SYSTEM.md`
- **User (Phase 1)**: Founder only. Household with family. Desktop-first. No push notifications.

## North star
- **Metric**: Meals actually cooked per week — target 4+/week over 2 consecutive weeks. Plans generated ≠ success.
- **Signal**: Post-dinner family verdict ("Everyone loved it" / "It was alright" / "Won't make again")
- **Phase 1 exit**: First plan <90s from cold start · 4+ meals cooked/week for 2 weeks · planning rated 8/10+

## Current state
- Live: https://rasa-app-woad.vercel.app/ | Phase 1 shipped with bugs
- Active WAU: [check analytics] | Biggest drop-off: [check analytics] | PMF signal: None yet
- Last validated learning: [fill in after each experiment]

## Core loop (Phase 1)
```
Onboarding (3Q, 60s) → Pantry + week context + use-soon → AI complete-meal plan
→ Shopping list → Cook mode or recipe detail → Mark as cooked
→ Evening family verdict (next app open) → Recipe bank grows → Repeat weekly
```
- Onboarding 3Q: dietary rules · who cooking for · primary + secondary cuisine
- Weekly inputs: pantry free-text (units optional) · week context · use-soon items
- Feedback: two moments, never collapsed — mark as cooked (cooking signal) + family verdict (outcome signal)
- Recipe bank: grows as byproduct of planning, not a prerequisite

## Personas
| Persona | Job to be done | Core pain | Freq |
|---|---|---|---|
| Priya (founder, Phase 1) | Feed family well, zero decision fatigue | Too many decisions, food waste, different preferences | Weekly |
| Busy parent (Phase 2 target) | Weeknight meals without thinking | No time, picky family, wastes bought ingredients | Weekly |

## Phase roadmap
| Phase | Status | Summary |
|---|---|---|
| 0 | Shipped | Basic 5-screen app: inventory, Tonight's Kitchen, recipe gen, basic planner |
| 1 | Shipped (bugs) | Onboarding · pantry-first planning · complete-meal AI recipes · cooking tips · prep-ahead · Serve With · cook mode · feedback loop · profile · "What's Cooking" card · measurement toggle · free-text recipe paste |
| 2 | Planned | Learning/preference model · mid-week plan adjustment · batch cooking mode · multi-meal day planning · end-of-week pride · meal bundles · fusion cuisine suggestions |

## Active work (this quarter)
| # | Task | Hypothesis | Metric | Status |
|---|---|---|---|---|
| 1 | Fix Phase 1 bugs | Bugs cause drop-off before first plan | 0 critical bugs | In progress |
| 2 | Phase 1 testing | Untested code has hidden bugs | >80% service layer coverage | Up next |
| 3 | UX redesign implementation | Per rasa_ux_handoff_phase1.html | Design review pass | Planned |

## NOT building (firm — do not suggest)
- Calorie / macro tracking or display — healthy by default, other apps own this
- Persistent fridge inventory — replaced by session-based pantry snapshot
- Lock toggles on planner — collaboration feature, irrelevant for single household
- Multi-meal day planning (breakfast/lunch) — Phase 2 only
- Meal bundles / parallel cook mode — Phase 2; Serve With covers Phase 1
- Mid-week silent plan adjustment — Phase 2; manual regeneration with current pantry only
- Social sharing — not in target behaviour
- User auth / login — pre-auth anonymous identity for Phase 1
- Recipe URL import — Phase 2; free-text paste covers Phase 1

## Decisions log (rolling — last 5)
| Date | Decision | Reason |
|---|---|---|
| 2025 | Pre-auth anonymous identity for Phase 1 | Reduce friction; validate core loop before adding auth |
| 2025 | shadcn/ui base-nova theme | Modern component library with @base-ui/react primitives |
| 2025 | Session-based pantry over persistent inventory | Persistent DB always stale, constant maintenance burden |
| 2025 | Two-moment feedback (cook signal + family verdict) | Cooking done ≠ family happy; collapsing them produces noisy signal |
| 2025 | "What's Cooking" replaces "Tonight's Kitchen" | Sessions happen any time of day; name must work for breakfast too |

## File index
| File | Load when | Contains |
|---|---|---|
| `PRODUCT_CONTEXT.md` | Always | This file — current state, loop, roadmap, decisions |
| `DESIGN_SYSTEM.md` | UX work · any copy or UI changes | Colours, tone, naming rules, UI laws |
| `PLAN_ENGINE.md` | AI prompt work · plan generation · recipe logic | Input hierarchy, generation order, recipe completeness model |
| `DECISIONS_ARCHIVE.md` | Need historical context | Graduated decisions, old experiments |