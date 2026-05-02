# CLAUDE.md — Rasa App

This file is read by every Claude Code session working on this project. Follow it exactly.

---

## 1. Project Overview

Rasa is an AI-powered meal planning app for an Indian household. It manages a weekly meal plan, a recipe bank, a fridge/pantry inventory, a smart shopping list, and a nightly kitchen prep assistant ("Tonight's Kitchen") that walks the user through cooking dinner while preparing tomorrow's brunch in parallel. The stack is pre-auth (all rows use `user_id IS NULL` until auth is wired); UI is mobile-first at 390px.

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
| Fonts | Local Geist (GeistVF.woff, GeistMonoVF.woff) | — |
| Deployment | Vercel | — |

**AI model used in all prompts:** `claude-sonnet-4-20250514`

---

## 3. Project Structure

```
rasa-app/
├── app/
│   ├── api/                        # All server-side route handlers
│   │   ├── inventory/parse/        # POST — Claude parses Hinglish pantry text
│   │   ├── inventory/save/         # POST (upsert) / PATCH / DELETE inventory items
│   │   ├── kitchen/session/        # POST (generate) / GET (today) / PATCH (mark done)
│   │   ├── plans/generate/         # POST — Claude generates 7-day meal plan
│   │   ├── recipes/generate/       # POST — Claude generates a recipe
│   │   └── shopping/generate/      # POST — aggregates plan → shopping list
│   ├── components/                 # Shared client components used across pages
│   │   ├── BottomNav.tsx           # Persistent 5-tab bottom navigation
│   │   └── KitchenHomeCard.tsx     # Time-aware kitchen card for home screen
│   ├── inventory/
│   │   ├── page.tsx                # Inventory list (swipe-delete, inline edit)
│   │   └── update/page.tsx         # 3-stage NLP update flow (input→review→saved)
│   ├── kitchen/
│   │   ├── page.tsx                # Tonight's Kitchen + step-by-step cook mode
│   │   └── morning/page.tsx        # Morning finish-steps view
│   ├── planner/
│   │   └── page.tsx                # 7-day meal plan grid with swap modal
│   ├── recipes/
│   │   ├── page.tsx                # Recipe bank grid
│   │   ├── [id]/page.tsx           # Recipe detail (ingredients + steps)
│   │   ├── add/generate/page.tsx   # AI recipe generation form
│   │   └── review/page.tsx         # Inline-editable recipe review before save
│   ├── shopping/
│   │   └── page.tsx                # Shopping list with per-category checkboxes
│   ├── fonts/                      # Local Geist font files
│   ├── globals.css                 # HSL CSS variables for Tailwind theming
│   ├── layout.tsx                  # Root layout — wraps all pages, mounts BottomNav
│   └── page.tsx                    # Home screen
├── components/
│   └── ui/                         # shadcn/ui components (do not edit manually)
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       └── textarea.tsx
├── lib/
│   ├── types.ts                    # All shared TypeScript interfaces
│   ├── utils.ts                    # cn() helper (clsx + tailwind-merge)
│   └── supabase/
│       ├── client.ts               # Browser client (createBrowserClient)
│       ├── server.ts               # Server client (createServerClient + SSR cookies)
│       └── admin.ts                # Service-role admin client (bypasses RLS)
├── .env.local                      # Never commit — see §8 for required vars
├── CLAUDE.md                       # This file
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Existing Patterns

### Supabase client usage
- **Browser (client components):** `import { createClient } from '@/lib/supabase/client'`
- **Server route handlers:** Use BOTH clients in every route:
  ```ts
  const admin = createAdminClient()   // all DB writes/reads
  const anon  = createClient()        // auth.getUser() only
  const { data: { user } } = await anon.auth.getUser()
  ```
- **Never** use the server client (`lib/supabase/server.ts`) for DB writes — always use admin client in route handlers.

### Pre-auth RLS pattern
All tables allow `user_id IS NULL` rows for pre-login development. The query pattern for user-scoped reads is:
```ts
const q = admin.from('table').select('*')
const { data } = await (
  user?.id
    ? q.or(`user_id.eq.${user.id},user_id.is.null`)
    : q.is('user_id', null)   // NOT .or('user_id.eq.null,...') — that sends "null" as UUID string
)
```

### Claude API calls (all route handlers)
```ts
import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic()
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
})
const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
const jsonMatch = raw.match(/\{[\s\S]*\}/)   // strip any markdown wrapper
const parsed = JSON.parse(jsonMatch[0])
```

### State management
No global store. All state is local `useState` + `useTransition` for async actions. Data flows from Supabase → component state on mount, and is written back via `fetch()` to API routes.

### Component structure
- Pages are self-contained. Sub-components are defined as functions in the same file unless they are reused across pages (in which case they live in `app/components/`).
- UI primitives come from `components/ui/` (shadcn). Never edit those files directly.
- Every AI-trigger button uses `useTransition` with a spinner state:
  ```tsx
  const [isPending, startTransition] = useTransition()
  // button: disabled={isPending}
  // label: isPending ? <spinner /> : 'Generate'
  ```

### Error display pattern
```tsx
{error && (
  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>{error}</span>
  </div>
)}
```

### Skeleton loading pattern
Every page that loads async data must show a skeleton before data arrives. Pattern:
```tsx
{loading && (
  <div className="space-y-4 animate-pulse">
    <div className="h-28 bg-muted rounded-xl" />
    <div className="h-16 bg-muted rounded-lg" />
  </div>
)}
{!loading && data.length === 0 && <EmptyState />}
{!loading && data.length > 0 && <ActualContent />}
```

### Navigation
Use `useRouter().push('/path')` — never `<Link asChild>` (breaks with base-nova). The `BottomNav` uses `<Link>` directly (no asChild).

### Naming conventions
- Files: kebab-case directories, PascalCase component files in `app/components/`
- API routes: REST verbs map to HTTP methods in the same `route.ts` file
- Types: PascalCase interfaces in `lib/types.ts` — add new types there, never inline
- CSS: Tailwind only, no CSS modules, no styled-components

---

## 5. Phase-0 Feature Inventory

### Screens

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Home — greeting, macro bars, today's meals, kitchen card, quick actions |
| `/recipes` | `app/recipes/page.tsx` | Recipe bank grid, clickable cards |
| `/recipes/[id]` | `app/recipes/[id]/page.tsx` | Recipe detail — macros, ingredients, numbered steps |
| `/recipes/add/generate` | `app/recipes/add/generate/page.tsx` | AI recipe generation (single-word input guardrail) |
| `/recipes/review` | `app/recipes/review/page.tsx` | Inline-edit review before saving to Supabase |
| `/planner` | `app/planner/page.tsx` | 7-day grid, protein totals, swap modal, lock/eating-out |
| `/inventory` | `app/inventory/page.tsx` | Use Soon / Fridge / Freezer / Pantry, swipe-delete, inline edit |
| `/inventory/update` | `app/inventory/update/page.tsx` | NLP update: input → review (checklist) → saved |
| `/shopping` | `app/shopping/page.tsx` | Grouped shopping list, checkboxes, add item, copy to clipboard |
| `/kitchen` | `app/kitchen/page.tsx` | Tonight's session, step-by-step cook mode, batch opportunities |
| `/kitchen/morning` | `app/kitchen/morning/page.tsx` | Morning finish-steps view, mark brunch done |

### Shared Components

| Component | File | Description |
|---|---|---|
| `BottomNav` | `app/components/BottomNav.tsx` | Fixed 5-tab nav: Home/Plan/Recipes/Fridge/Shop |
| `KitchenHomeCard` | `app/components/KitchenHomeCard.tsx` | Time-aware kitchen card (preview <5pm, full card ≥5pm) |

### API Routes

| Route | Methods | Description |
|---|---|---|
| `/api/recipes/generate` | POST | Claude → recipe JSON → save to `recipes` |
| `/api/plans/generate` | POST | Claude → 7-day plan JSON → save to `week_plans` |
| `/api/inventory/parse` | POST | Claude → parses Hinglish text → `ParsedInventoryItem[]` |
| `/api/inventory/save` | POST / PATCH / DELETE | Smart-merge upsert / field update / delete inventory items |
| `/api/shopping/generate` | POST | Aggregate ingredients → subtract inventory → save `shopping_lists` |
| `/api/kitchen/session` | POST / GET / PATCH | Generate/load/complete today's cooking session |

### Supabase Tables

| Table | Key columns |
|---|---|
| `recipes` | id, user_id, name, cuisine_type, meal_type, servings, cook_time_minutes, ingredients (jsonb), steps (jsonb), macros_per_serving (jsonb), batch_cookable |
| `week_plans` | id, user_id, week_start_date, slots (jsonb: `{slots, daily_totals, batch_opportunities}`) |
| `inventory_items` | id, user_id, name, quantity, unit, location (fridge/freezer/pantry), use_soon, low_stock |
| `shopping_lists` | id, user_id, week_plan_id, items (jsonb: `Record<category, ShoppingListItem[]>`) |
| `cooking_sessions` | id, user_id, week_plan_id, session_date, dinner_recipe_id, dinner_recipe_name, brunch_recipe_id, brunch_recipe_name, session_duration_minutes, prep_tasks (jsonb), tomorrow_finish_steps (jsonb), batch_opportunities (jsonb), brunch_done |

All tables: RLS enabled, policy `auth.uid() = user_id OR user_id IS NULL`, `GRANT SELECT,INSERT,UPDATE,DELETE TO anon, authenticated, service_role`.

---

## 6. Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Production build (run before every deploy to catch errors)
npm run build

# Linting
npm run lint

# Type check only (no emit)
npx tsc --noEmit

# Deploy to Vercel (must be logged in: npx vercel login)
npx vercel --prod --yes

# Add an env var to Vercel
npx vercel env add VAR_NAME production
```

There are no tests. `npm test` does not exist.

---

## 7. What NOT To Do

### shadcn v4 / base-nova specifics (will break the build)
- **Never use `asChild` prop** — shadcn 4.6 uses `@base-ui/react`, not Radix UI. `asChild` does not exist and causes TypeScript errors.
- **Never wrap `<Button>` inside `<DropdownMenuTrigger>`** — base-nova's trigger already renders `<button>`, nesting another button is invalid HTML. Instead apply `className={buttonVariants({ variant: 'default' })}` directly on the trigger.
- **Never import from `"shadcn/tailwind.css"`** — that is Tailwind v4 syntax, incompatible with this project's Tailwind v3. globals.css uses standard `@tailwind base/components/utilities` + HSL CSS variables.

### Supabase gotchas
- **Never query `.or('user_id.eq.null,...')`** — passes the string `"null"` as a UUID, causes `invalid input syntax for type uuid` error. Use `.is('user_id', null)` for the no-auth branch.
- **Never write to DB from server components** — use route handlers with `createAdminClient()`.
- **Never rely on RLS + anon key for writes** — the `sb_secret_` format service role key can't decode its JWT role claim in supabase-js. Always use `createAdminClient()` for all DB mutations in route handlers.

### Next.js
- **Never import `{ Geist }` from `"next/font/google"`** — that font export doesn't exist in Next.js 14 (it was added in v15). Use the local font files already in `app/fonts/`.
- **Always run `npm run build` before committing** — ESLint runs at build time and unused vars / unescaped entities fail the build.

### Common ESLint failures at build time
- Unused variables: prefix with `_` only works for function params; for `useState` destructuring, remove the unused variable entirely
- Unescaped apostrophes in JSX: use `&apos;` or `{''}`
- Route handlers: if no request body is read, omit the `request` param entirely (don't name it `_request` — ESLint still flags it)

### Architecture
- **No global state library** — don't introduce Redux, Zustand, or Context for features that don't need it. Local state has been sufficient for all Phase-0 features.
- **No CSS modules or styled-components** — Tailwind only.
- **Don't edit `components/ui/` files** — they are managed by shadcn CLI. Re-run `npx shadcn add <component>` to update them.

### Known technical debt
- No auth wired yet — all rows are `user_id = null`. RLS policies allow this via `OR user_id IS NULL`.
- Day abbreviations in `week_plans.slots` are 3-letter (`Mon`, `Tue`, ..., `Sun`) — any code matching day names must use this format, not full names.
- Cook mode prep task matching uses fuzzy keyword overlap between `parallel_with` and step text. It works for most cases but can miss matches on short or uncommon words.
- No error boundary — unhandled promise rejections in `useEffect` can cause silent failures on initial load.

---

## 8. Environment Variables

Required in `.env.local` (local) and in Vercel project settings (production):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>   # sb_secret_... format
ANTHROPIC_API_KEY=sk-ant-api03-...
```

- `NEXT_PUBLIC_*` vars are exposed to the browser — safe for Supabase URL and anon key.
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are server-only — never reference them in client components.
- Supabase project ID: `hdzzmeeflrtccxupxzhn`
- Vercel project: `aikanshs-projects/rasa-app` — live at `https://rasa-app-woad.vercel.app`

---

## 9. Git Conventions

**Remote:** `https://github.com/AnkitaY/rasa-app.git` (branch: `master`)

**Commit message format** (established pattern from this project):
```
<type>: <short imperative description>

<optional body — what and why, not how>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types used: `feat`, `fix`, `chore`

**Examples from this repo:**
```
feat: Feature F7 — Tonight's Kitchen
fix: use abbreviated day names (Mon/Tue) to match week_plans slots format
fix: nav z-index + cook mode shows only matched prep tasks per step
feat: Phase 0 complete — full RASA loop working
```

**Workflow:**
1. `npm run build` — must pass cleanly before committing
2. `git add <specific files>` — never `git add -A` blindly (avoid committing `.env.local`)
3. `git commit -m "..."` using HEREDOC for multiline messages
4. `git push`
5. `npx vercel --prod --yes` — redeploy after pushing

No branches have been created yet; all work is on `master`.

## AgentOS integration

This project is managed by a three-agent system:
- PM Agent (Claude Chat): owns requirements and PRD
- UX Agent (Claude Chat): owns design specs and proposals  
- Engineering Agent (Claude Chat): owns this brief and fires 
  Claude Code sessions via Routines

### Shared context location
Google Drive: /AgentOS/MealPlannerApp/
- COMPANY.md — product vision and constraints
- PRD.md — features and acceptance criteria  
- DECISIONS.md — all approved decisions
- HANDOFFS.md — tickets between agents
- BLOCKERS.md — unresolved questions

### How implementation briefs arrive
Each Claude Code session receives an implementation brief 
in the text field of the Routine trigger. The brief will 
reference a HANDOFF-[N] number. Read the brief completely 
before touching any file.

### Phase-0 status
Phase-0 is complete. All existing code is considered 
stable baseline. Do not refactor existing code unless 
the brief explicitly instructs it.

### Branch convention
- Feature branches: feature/HANDOFF-[N]-[short-description]
- All PRs open as draft against main
- PR title format: [HANDOFF-N] Feature name — summary