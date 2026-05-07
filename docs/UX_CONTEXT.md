# UX context
# TOKEN BUDGET: 400 | Update: per design milestone | Owner: Founder

## Design principles (ranked — apply in this order)
1. Progressive disclosure: show only what the user needs for their next step
2. Default to action: pre-fill sensible defaults, make the right choice obvious
3. Celebrate small wins: completing a step should feel good
4. Never blame: if users fail, the design failed first
5. Ethical gate: would this feel manipulative if the user noticed it?

## Tone of voice
| Situation | Voice | Example |
|---|---|---|
| Onboarding | Warm, simple verbs, encouraging | "Let's build your first plan" |
| Empty state | Action-oriented, helpful | "Your recipe bank fills up the moment you plan your first week." |
| Error | Calm, specific, tells user what to do next | "Hmm, something went wrong. Give it one more try?" |
| Success | Brief celebration, move forward | "Your week is sorted. 5 dinners, zero decision fatigue." |

**Never say:** "successfully", "Error:", "failed", "Please try again" without context.
Use contractions. Active voice. Short sentences. No guilt. No jargon.

## Behavioral design (Fogg model)
- Motivation × Ability × Prompt = Behavior
- New users: maximize ability (fewer steps), prompt at peak motivation (first landing)
- Returning users: build habit loop (meal variety as variable reward)
- Always ask: would this nudge feel manipulative if the user noticed it?

## User flows (status)
| Flow | Status | Known friction |
|---|---|---|
| Onboarding: 3-step preferences | Shipped | [FILL IN — where users drop or struggle] |
| Generate meal plan | Shipped | Loading wait time on generation |
| View planner + swap meals | Shipped | [FILL IN — friction point] |
| Shopping list | Shipped | [FILL IN — friction point] |
| Recipe detail | Shipped | [FILL IN — friction point] |

## Phase 1 design system
- Viewport: 390px mobile-first
- Background: p1-cream (#FAF7F2) on all pages
- Cards: p1-card (#FFFFFF) lifting off cream
- Primary action color: p1-terra (#C4522A) — CTAs, hero cards, active nav
- Success color: p1-forest (#2D5B3F) — cooked state, confirmations
- Secondary text: p1-brown (#6B4226) — never Tailwind gray-*
- Nav: p1-dark (#2B1C12) — bottom nav bar
- Font: DM Sans (font-ui class)

## Component vocabulary
| Component | Rule |
|---|---|
| Primary CTA | One per screen; most important action; p1-terra background |
| Destructive action | Always confirm dialog; red styling |
| Empty state | Always show first-action suggestion; never blank |
| Loading state | p1-surface skeleton with animate-pulse; never blank |
| Error message | What happened + what to do next; p1-brown text in p1-card |

## Accessibility baseline
- Tap/click targets: minimum 44×44pt
- Color contrast: WCAG AA minimum
- No information by color alone — always pair with text/icon
