# Design System — Rasa
# TOKEN BUDGET: 400 | Update: when design decisions change | Owner: Founder + UX
# LOAD ALONGSIDE: product.context.md

---

## Colour palette
| Token | Hex | Semantic role — use exactly as described, no improvising |
|---|---|---|
| Page background | #FAF7F2 | Warm cream on every page — replaces cold white throughout |
| Cards | #FFFFFF | Pure white — lifts off cream bg to create subtle depth |
| Surfaces | #EDE0D0 | Section headers, chip backgrounds, secondary surfaces |
| Terracotta | #C4522A | Primary actions · "What's Cooking" card (always) · active/selected states · timing tips |
| Forest | #2D5B3F | Success & completion ONLY — cooked meals, "Everyone loved it", doneness tips |
| Mid brown | #6B4226 | Secondary text, labels, metadata — replaces cool Tailwind gray |
| Dark | #2B1C12 | Nav bar, primary body text — the palette anchor |

**Replacing shadcn/ui defaults**
- Cold white (#FFFFFF) as page bg → #FAF7F2
- Tailwind gray-500 (#6B7280) for secondary text → #6B4226
- Default blue links/focus states → terracotta #C4522A
- Default green success states → forest #2D5B3F

## Colour laws — never break these
1. **"What's Cooking" card is always terracotta** — every screen state, every day, every meal. If it looks like any other card, hierarchy is broken.
2. **Forest is never used for primary actions.** Terracotta is never used for success/completion. They are siblings with distinct roles — do not swap them.
3. **No new colours without PM sign-off.** Work within the seven tokens above.

## Tone of voice
Rasa sounds like a trusted friend who knows a lot about cooking — warm, direct, occasionally funny. Never clinical, never corporate.

### Rules
- Use contractions always. "You're" not "You are."
- Celebrate small wins. Cooking is hard work — acknowledge it.
- Short sentences. One idea at a time.
- Humour is welcome when it fits naturally. Never forced, never sarcastic.
- Never write "successfully" — say what happened instead.
- No guilt copy — never imply she didn't cook enough or plan well.
- No passive voice. Active and direct always.

### Before / after — use as a reference
| ✕ Clinical | ✓ Rasa voice |
|---|---|
| "Please select your dietary restrictions." | "Anything we should never put on the menu? Allergies, things you'd rather forget exist?" |
| "Error: update failed. Please try again." | "Hmm, something went wrong. Give it one more try?" |
| "Meal plan generated successfully. 7 meals added." | "Your week is sorted. 7 dinners, zero decision fatigue." |
| "No recipes found. Add recipes to get started." | "Your recipe bank is empty for now — it fills up the moment you generate your first plan." |
| "Please rate this meal." | "How did it land last night?" |

## Naming conventions — use these exactly, nowhere else
| Use | Never use |
|---|---|
| Pantry | Fridge, Inventory, Stock |
| What's Cooking | Tonight's Kitchen, Cook Now, Current Meal |
| This week's pantry | Fridge inventory, Current stock |
| Recipe bank | Recipe library, Recipe list |
| Mark as cooked | Complete, Done, Finished |
| Family verdict | Rating, Review, Score |
| Serve with | Side dish, Accompaniment, Pairing |

## Key UI rules
- **Measurement toggle**: Cups · Grams · Both (default: Both). Lives in recipe header. Per-recipe, not global. State carries from recipe detail into cook mode for the same recipe. No persistence between sessions.
- **Empty states**: always warm, never blank. Every empty state has a clear reason and a gentle next step.
- **Feedback prompt**: in-context card on Home, never a modal or push notification. Shown once per meal. Fully dismissable. Never repeated.
- **"What's Cooking" CTAs**: two — "Let's cook" (launches step-by-step cook mode) + "View full recipe" (opens recipe detail). Cook mode is primary, lighter weight for recipe detail.
- **Lock toggles**: removed entirely from planner. Do not re-introduce.
- **Macros/calories**: removed entirely from all screens. Do not display in any form.