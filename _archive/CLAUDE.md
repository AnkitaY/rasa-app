# CLAUDE.md — Rasa App

This file is read by every Claude Code session working on this project. Follow it exactly.

---

## 1. Project Overview

Rasa is an AI-powered meal planning app. It manages a weekly meal plan, a recipe bank, a pantry snapshot, a smart shopping list, and a nightly kitchen prep assistant ("Tonight's Kitchen"). The app is pre-auth — all rows use `user_id IS NULL`; identity is tracked via `rasa_anon_id` in localStorage. UI is mobile-first at 390px.

**Phase 1 is complete.** Phase 0 features (inventory, kitchen, old planner) are preserved but not linked from the Phase 1 nav. Do not refactor them.

---

## 2. Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |
| UI components | shadcn/ui (base-nova theme) | 4.6.0 |
| Base UI primitives | @base-ui/react | ^1.4.1 |
| Icons | lucide-react | ^1.14.0 |
| Class utilities | clsx + tailwind-merge + class-variance-authority | latest |
| Database | Supabase (@supabase/supabase-js + @supabase/ssr) | 2.105.1 / 0.10.2 |
| AI | @anthropic-ai/sdk | ^0.92.0 |
| Fonts | DM Sans (Google, variable `--font-dm-sans`, class `font-ui`) + local Geist fallback |
| Deployment | Vercel | — |

**AI model used in all prompts:** `claude-sonnet-4-20250514`

---

## 3. Project Structure

```
rasa-app/
├── app/
│   ├── api/
│   │   ├── inventory/parse/           # POST — Claude parses Hinglish pantry text (Phase 0)
│   │   ├── inventory/save/            # POST/PATCH/DELETE inventory items (Phase 0)
│   │   ├── kitchen/session/           # POST/GET/PATCH cooking session (Phase 0)
│   │   ├── meals/
│   │   │   ├── cooked/route.ts        # PATCH { meal_id } → cooked=true
│   │   │   ├── current/route.ts       # GET ?anon_id → meals for latest plan
│   │   │   ├── swap/route.ts          # POST (3 alternatives) / PATCH (apply swap)
│   │   │   └── verdict/route.ts       # PATCH { meal_id, verdict?, dismiss? }
│   │   ├── plans/
│   │   │   ├── generate/              # POST — Phase 0 plan generator (legacy)
│   │   │   └── generate-v2/route.ts   # POST — Phase 1 plan generator (active)
│   │   ├── preferences/
│   │   │   ├── get/route.ts           # GET ?anon_id → preferences row or null
│   │   │   └── save/route.ts          # POST { anon_id, ...fields } → upsert
│   │   ├── recipes/
│   │   │   ├── generate/              # POST — Claude generates a single recipe (Phase 0)
│   │   │   └── import/route.ts        # POST { url } → Claude structures → save to DB
│   │   └── shopping/
│   │       └── generate/route.ts      # POST { anon_id } → grouped shopping list
│   ├── components/
│   │   ├── BottomNav.tsx              # Phase 1 dark nav — Home/Planner/Pantry/Shopping/Recipes
│   │   ├── KitchenHomeCard.tsx        # Phase 0 kitchen card (not in Phase 1 nav)
│   │   ├── OnboardingGuard.tsx        # Redirect to /onboarding if no prefs row
│   │   └── SwapSheet.tsx             # 2-step slide-up: reason → 3 alternatives
│   ├── inventory/                     # Phase 0 — not linked from Phase 1 nav
│   ├── kitchen/                       # Phase 0 — not linked from Phase 1 nav
│   ├── onboarding/
│   │   ├── page.tsx                   # Q1: dietary rules
│   │   ├── who-for/page.tsx           # Q2: who are you cooking for
│   │   └── cuisine/page.tsx           # Q3: primary + secondary cuisine → /planner/generate
│   ├── pantry/
│   │   └── page.tsx                   # Last pantry input + update field + regen CTA
│   ├── planner/
│   │   ├── page.tsx                   # Phase 1 planner — meals table, SwapSheet, no macros
│   │   └── generate/page.tsx          # 3-field form → rotating messages → stagger reveal
│   ├── profile/
│   │   └── page.tsx                   # Preferences editor (Block 1 + Block 2), ⚙ from Home
│   ├── recipes/
│   │   ├── page.tsx                   # Recipe bank — cuisine filters, search, Phase 1 style
│   │   ├── [id]/page.tsx              # Recipe detail — dark header, steps_v2, prep_ahead
│   │   ├── add/generate/page.tsx      # AI recipe generation (Phase 0)
│   │   ├── add/import/page.tsx        # Import from URL
│   │   └── add/manual/page.tsx        # Manual recipe entry
│   ├── shopping/
│   │   └── page.tsx                   # Auto-generates on mount, check-off items, copy list
│   ├── globals.css                    # Phase 0 HSL vars + Phase 1 p1-* tokens
│   ├── layout.tsx                     # Root layout — DM Sans font, OnboardingGuard, BottomNav
│   └── page.tsx                       # Home V2 — hero card, feedback card, week strip
├── components/
│   └── ui/                            # shadcn/ui components (do not edit manually)
├── lib/
│   ├── anon.ts                        # getAnonId() — reads/writes rasa_anon_id in localStorage
│   ├── types.ts                       # All shared TypeScript interfaces
│   ├── utils.ts                       # cn() helper
│   └── supabase/
│       ├── client.ts                  # Browser client
│       ├── server.ts                  # Server client (SSR cookies)
│       └── admin.ts                   # Service-role admin client (bypasses RLS)
├── CLAUDE.md
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Phase 1 Design Tokens

All Phase 1 UI uses `p1-*` Tailwind tokens. **Never rename** them — Phase 0 Kitchen files use the original `rasa-*` tokens and must not break.

```
p1-cream        #FAF7F2   — every page background
p1-card         #FFFFFF   — card bg (lifts off cream)
p1-surface      #EDE0D0   — chips, selected bg, skeleton placeholders
p1-terra        #C4522A   — hero card, primary CTAs, active nav dot, timing tips
p1-terra-lt     #F5E6DF   — selected chip fill, terra hover state
p1-forest       #2D5B3F   — cooked state, success, doneness tips
p1-forest-lt    #E2EDE6   — cooked card bg tint
p1-brown        #6B4226   — all secondary text, labels, metadata
p1-dark         #2B1C12   — nav bar bg, page titles, recipe header bg
p1-border       #DED2C2   — standard card/input borders
p1-border-lt    #EDE0D0   — light dividers, row separators
```

**Semantic rules:**
- Terra = hero card (always), primary CTAs, active chips/nav dot, "tonight" labels, timing tips
- Forest = cooked state, "Everyone loved it", doneness tips, success confirmations
- Brown = all secondary text (never Tailwind `gray-*`)
- Dark = nav bg, page titles, recipe header bg
- Never use terra for Forest's purposes, or vice versa

**Font:** `font-ui` = DM Sans. Applied via `className="font-ui"`. Variable `--font-dm-sans` loaded in `app/layout.tsx`.

---

## 5. Phase 1 Navigation

**5 tabs:** Home / Planner / Pantry / Shopping / Recipes

| Tab | Route | Icon |
|---|---|---|
| Home | `/` | Home (lucide) |
| Planner | `/planner` | CalendarDays |
| Pantry | `/pantry` | ShoppingBasket |
| Shopping | `/shopping` | ShoppingCart |
| Recipes | `/recipes` | BookOpen |

- Nav bg: `#2B1C12` (p1-dark) via inline style
- Active: `text-p1-terra` + 4px terra dot below icon
- Inactive: `rgba(255,255,255,0.4)`
- Profile is **not** in nav — accessed via ⚙ icon in Home header, route `/profile`

---

## 6. Phase 1 Identity (pre-auth)

All Phase 1 rows have `user_id IS NULL`. Identity is tracked by `anon_id`:

```ts
import { getAnonId } from '@/lib/anon'
const anonId = getAnonId()  // reads/creates rasa_anon_id in localStorage — CLIENT ONLY
```

**Never call `getAnonId()` in server components or route handlers** — pass `anon_id` in the request body from the client.

---

## 7. Database Schema

### Phase 1 tables

```sql
user_preferences
  id, anon_id (unique), dietary_rules (text), who_cooking_for (text),
  primary_cuisine (text), secondary_cuisines (text[]), skill_level (text),
  weeknight_budget (text), goals (text[]), banned_ingredients (text),
  cook_days_per_week (int, default 5), last_pantry_input (text), created_at

meals
  id, week_plan_id (FK → week_plans.id), day (text), meal_type (text, default 'dinner'),
  recipe_name (text), eating_out (bool), serve_with (text), reasoning (text),
  cooked (bool), cooked_at (timestamptz), swapped_from (text), verdict (text),
  verdict_shown (bool), notes (text), use_soon_priority (bool), created_at
```

### Phase 0 / altered tables

```sql
recipes
  id, user_id, name, cuisine_type, meal_type, servings, cook_time_minutes,
  ingredients (jsonb: [{name, quantity, unit}]),
  steps (jsonb: string[]),                          -- legacy
  steps_v2 (jsonb: [{instruction, tip_type?, tip_text?}]),  -- Phase 1
  prep_ahead (jsonb: [{task, time_sensitive}]),
  is_complete_meal (bool, default true),
  source_type (text), source_url (text), batch_cookable (bool)

week_plans
  id, user_id, anon_id, week_start_date,
  slots (jsonb: {slots: PlanSlot[], daily_totals: [], batch_opportunities: []}),
  pantry_snapshot (text), week_context (text), use_soon_text (text)

inventory_items, shopping_lists, cooking_sessions  -- Phase 0, untouched
```

**`week_plans.slots` format:** The JSONB value is a full GeneratedPlan object: `{ slots: PlanSlot[], daily_totals: [], batch_opportunities: [] }`. The Kitchen feature reads `week_plan.slots.slots`. **Never** store a flat `PlanSlot[]` directly.

**Day abbreviations in slots:** Always use 3-letter format: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`.

---

## 8. Phase 1 API Routes

### Preferences

| Route | Method | Body / Params | Returns |
|---|---|---|---|
| `/api/preferences/get` | GET | `?anon_id=<uuid>` | `{ preferences }` or `{ preferences: null }` |
| `/api/preferences/save` | POST | `{ anon_id, ...any fields }` | `{ ok }` — upserts partial update |

### Plans

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/plans/generate-v2` | POST | `{ anon_id, pantry_input, week_context?, use_soon? }` | `{ ok, week_plan_id, meals[], recipe_ids }` |

### Meals

| Route | Method | Body / Params | Returns |
|---|---|---|---|
| `/api/meals/current` | GET | `?anon_id=<uuid>` | `{ meals[] }` with recipe_id enrichment |
| `/api/meals/cooked` | PATCH | `{ meal_id }` | `{ ok }` |
| `/api/meals/swap` | POST | `{ meal_id, reason, ingredient?, free_text? }` | `{ alternatives[] }` |
| `/api/meals/swap` | PATCH | `{ meal_id, chosen }` | `{ meal }` |
| `/api/meals/verdict` | PATCH | `{ meal_id, verdict? }` or `{ meal_id, dismiss: true }` | `{ ok }` |

### Shopping

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/shopping/generate` | POST | `{ anon_id }` | `{ groups: Record<category, ShoppingListItem[]>, total }` |

Shopping groups: `Produce → Protein → Dairy → Spices → Pantry → Other`

### Recipes

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/recipes/import` | POST | `{ url }` | `{ ok, recipe: { id, name } }` |

---

## 9. Core Patterns

### Supabase client usage
- **Browser (client components):** `import { createClient } from '@/lib/supabase/client'`
- **Route handlers:** `import { createAdminClient } from '@/lib/supabase/admin'` — use for all DB reads and writes
- **Never** use the server client (`lib/supabase/server.ts`) for DB writes

### Pre-auth anon_id pattern (route handlers)
```ts
// Body: { anon_id?: string }
const { data } = await admin
  .from('table')
  .select('*')
  .eq('anon_id', anon_id)
  .maybeSingle()
```

### Claude API calls
```ts
import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic()
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  messages: [{ role: 'user', content: prompt }],
})
const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
const match = raw.match(/\{[\s\S]*\}/)
const parsed = JSON.parse(match![0])
```

### Async data fetching in client components
Use `async function load()` inside `useEffect` — never chain `.finally()` on a Supabase PromiseLike:
```tsx
useEffect(() => {
  async function load() {
    try {
      const { data } = await createClient().from('table').select('*').single()
      if (data) setData(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }
  load()
}, [id])
```

### Loading skeletons
```tsx
if (loading) {
  return (
    <main className="min-h-screen bg-p1-cream">
      <div className="px-5 pt-12 pb-6">
        <div className="h-7 w-40 bg-p1-surface rounded animate-pulse" />
      </div>
      <div className="px-5 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-p1-surface rounded-2xl animate-pulse" />
        ))}
      </div>
    </main>
  )
}
```

### Error display (Phase 1 tone)
```tsx
{error && (
  <div className="mx-5 mb-5 px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
    <p className="text-sm font-ui text-p1-brown">{error}</p>
  </div>
)}
```

### SwapSheet
- Lives at `app/components/SwapSheet.tsx`
- Built on `@base-ui/react/dialog` primitives — no Sheet component exists in base-nova
- 2 steps: reason → alternatives; slide-up animation via inline `@keyframes swapSlideUp`
- Props: `meal: Meal`, `onSwapped: (updatedMeal: Meal) => void`, `onClose: () => void`

### State management
No global store. All state is local `useState`. Data flows Supabase → component state on mount, written back via `fetch()` to API routes.

---

## 10. Tone of Voice

Every string in the UI — labels, empty states, errors, confirmations — must follow these rules:

| ✓ Write like this | ✕ Never write like this |
|---|---|
| "Hmm, something went wrong. Give it one more try?" | "Error: Request failed. Please try again." |
| "Your week is sorted. 5 dinners, zero decision fatigue." | "Meal plan generated successfully." |
| "Anything we should never put on the menu?" | "Please select your dietary restrictions." |
| "Your recipe bank fills up the moment you plan your first week." | "No recipes found. Add recipes to get started." |

- Use contractions. Active voice. Short sentences.
- Never say "successfully", "Error:", or "failed".
- No guilt. No jargon.

---

## 11. What NOT To Do

### shadcn v4 / base-nova
- **Never use `asChild` prop** — `@base-ui/react` doesn't have it
- **Never wrap `<Button>` inside `<DropdownMenuTrigger>`** — apply `buttonVariants()` className directly on the trigger
- **Never import from `"shadcn/tailwind.css"`** — Tailwind v4 syntax, incompatible with this project's v3

### Supabase
- **Never query `.or('user_id.eq.null,...')`** — passes `"null"` as a UUID string, causes a uuid parse error. Use `.is('user_id', null)` or `.eq('anon_id', anon_id)` instead
- **Never write to DB from server components** — use route handlers with `createAdminClient()`
- **Never chain `.finally()` on a Supabase PromiseLike** — use `async/await` with try/catch/finally inside `useEffect`

### ESLint (build will fail)
- Unused variables — remove them; prefixing with `_` only works for function parameters
- Unescaped apostrophes in JSX — use `&apos;`
- Ternary as a standalone statement — use `if/else` instead (ESLint `no-unused-expressions`)
- Route handler `request` param — omit entirely if the body is never read

### Next.js
- **Never import `{ Geist }` from `"next/font/google"`** — doesn't exist in Next.js 14. Local font files in `app/fonts/` are used instead.
- **Always run `npm run build` before committing** — ESLint runs at build time

### Architecture
- No global state library (no Redux, Zustand, Context)
- No CSS modules — Tailwind only
- Don't edit `components/ui/` — managed by shadcn CLI
- `getAnonId()` is client-side only — never call it in route handlers

---

## 12. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
ANTHROPIC_API_KEY=sk-ant-api03-...
```

- Supabase project ID: `hdzzmeeflrtccxupxzhn`
- Vercel project: `aikanshs-projects/rasa-app`

---

## 13. Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build — run before every commit
npm run lint         # ESLint only
npx tsc --noEmit     # Type check only
npx vercel --prod --yes   # Deploy to Vercel
```

---

## 14. Git Conventions

**Commit message format:**
```
<type>: <short imperative description>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`

**Workflow:** `npm run build` → stage specific files → commit → push → `npx vercel --prod --yes`

---

## 15. AgentOS Integration

This project is managed by a three-agent system:
- PM Agent (Claude Chat): owns requirements and PRD
- UX Agent (Claude Chat): owns design specs and proposals
- Engineering Agent (Claude Chat): owns this brief and fires Claude Code sessions via Routines

Shared context in Google Drive: `/AgentOS/MealPlannerApp/`
(COMPANY.md, PRD.md, DECISIONS.md, HANDOFFS.md, BLOCKERS.md)

Each Claude Code session receives an implementation brief referencing a HANDOFF-[N] number. Read the brief completely before touching any file.

### Phase status
- **Phase 0:** Complete. Inventory, Kitchen, old Planner, recipe generation. Not linked from Phase 1 nav — preserved as stable baseline.
- **Phase 1:** Complete. Onboarding, preferences, plan generation V2, planner V2, SwapSheet, home V2, recipe detail V2, URL import, shopping V2, profile. All 12 sessions delivered.
