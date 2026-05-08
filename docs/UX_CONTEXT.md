# UX Context — Rasa
# TOKEN BUDGET: 500 | Update: per design milestone | Owner: Founder
# LOAD ALONGSIDE: PRODUCT_CONTEXT.md + DESIGN_SYSTEM.md
# Colour semantics, tone rules, naming conventions → DESIGN_SYSTEM.md (not repeated here)

---

## Viewport & platform
- **Design: mobile-first, 390px base viewport**
- **Delivery: browser-based — not a native app.** No push notifications, no native device APIs (camera, contacts, etc.). Capabilities are limited to what the browser supports.
- Font: DM Sans (font-ui class)
- Desktop browsers also supported — design mobile-first, ensure desktop doesn't break

---

## Design principles (ranked — apply in this order)
1. **Progressive disclosure** — show only what the user needs for their next step
2. **Default to action** — pre-fill sensible defaults, make the right choice obvious
3. **Celebrate small wins** — completing a step should feel good
4. **Never blame** — if users fail, the design failed first
5. **Ethical gate** — would this feel manipulative if the user noticed it?

## Behavioral model (Fogg)
- Motivation × Ability × Prompt = Behavior
- New users: maximise ability (fewer steps) + prompt at peak motivation (first landing)
- Returning users: build habit loop — meal variety as variable reward
- Test every nudge: if the user noticed it, would it feel manipulative?

---

## Colour tokens (semantics and laws → DESIGN_SYSTEM.md)
| CSS token | Hex | When |
|---|---|---|
| p1-cream | #FAF7F2 | Every page background |
| p1-card | #FFFFFF | Card surfaces lifting off cream |
| p1-surface | #EDE0D0 | Section headers, chip backgrounds |
| p1-terra | #C4522A | Primary actions · "What's Cooking" card · active states |
| p1-forest | #2D5B3F | Success/completion ONLY — never primary actions |
| p1-brown | #6B4226 | Secondary text — never Tailwind gray-* |
| p1-dark | #2B1C12 | Nav bar, primary body text |

## Tone of voice (quick ref — full rules + before/after → DESIGN_SYSTEM.md)
| Situation | Voice | Example |
|---|---|---|
| Onboarding | Warm, simple verbs | "Let's build your first plan" |
| Empty state | Action-oriented | "Your recipe bank fills up the moment you plan your first week." |
| Error | Calm, specific, next step | "Hmm, something went wrong. Give it one more try?" |
| Success | Brief celebration, move forward | "Your week is sorted. 5 dinners, zero decision fatigue." |

---

## Component vocabulary
| Component | Rule |
|---|---|
| Primary CTA | One per screen. p1-terra background. Most important action only. |
| "What's Cooking" card | Always p1-terra. Always the visual anchor of Home. If it looks like any other card, hierarchy is broken. |
| Destructive action | Always confirm dialog. Red styling. |
| Empty state | Always show first-action suggestion. Never blank. |
| Loading state | p1-surface skeleton with animate-pulse. Conversational copy — not a spinner on a blank page. |
| Error message | What happened + what to do next. p1-brown text in p1-card. |
| Feedback prompt | In-context card on Home. Never modal, never push notification. Once per meal, fully dismissable, never repeated. |
| Measurement toggle | Cups · Grams · Both (default: Both). In recipe header and cook mode. Per-recipe — not global. Syncs between recipe detail and cook mode. |
| Swap reason prompt | 3 options: "Missing an ingredient" · "No time tonight" · "Something else" (→ free text). Reason drives replacement logic — do not skip it. |

## User flows (Phase 1 — all shipped)
| Flow | Status | Known friction |
|---|---|---|
| Onboarding: 3Q (dietary · who for · cuisine) → plan | Shipped | [fill in drop-off point] |
| Plan generation (pantry + week context + use-soon) | Shipped | Loading wait — needs warm copy |
| Planner: view + swap with reasons | Shipped | [fill in friction] |
| Recipe detail: tips + prep-ahead + Serve With + toggle | Shipped | [fill in friction] |
| Step-by-step cook mode (carousel) | Shipped — preserve as-is | [fill in friction] |
| Shopping list (grouped by category) | Shipped | [fill in friction] |
| Profile editor | Shipped | [fill in friction] |
| Mark as cooked → family verdict (next open) | Shipped | [fill in friction] |
| This week's pantry (session input → plan trigger) | Shipped | [fill in friction] |

## Phase 1 UX laws — do not violate
- **Onboarding is 3 questions → immediate first plan.** Never add a step before value is delivered.
- **"What's Cooking" card is always p1-terra and always dominates Home.** Non-negotiable — see DESIGN_SYSTEM.md.
- **Feedback is two separate moments.** Mark as cooked = cooking signal (she's at the stove). Family verdict = outcome signal (next app open after dinner). Never collapsed into one action.
- **Measurement toggle is per-recipe.** No global preference. Default is Both. Resets on next session.
- **Cook mode is preserved.** Step-by-step carousel from "What's Cooking" card. Do not replace with recipe detail.
- **Lock toggles are gone.** Do not re-introduce in any form.
- **Macros and calories are gone.** Do not display on any screen in any format.

## Accessibility baseline
- Click targets: minimum 44×44pt
- Colour contrast: WCAG AA minimum
- No information by colour alone — always pair with text or icon