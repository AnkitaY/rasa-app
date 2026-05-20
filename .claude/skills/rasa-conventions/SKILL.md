---
name: rasa-conventions
description: Rasa app coding conventions, patterns, and known gotchas. Load for all engineering tasks.
---
# Rasa app conventions

## File naming
- Pages: kebab-case folders in app/ (app/planner/page.tsx)
- Components: PascalCase (SwapSheet.tsx, BottomNav.tsx)
- Utilities: camelCase (anon.ts, utils.ts)
- API routes: kebab-case folders (app/api/meals/current/route.ts)
- Tests: [filename].test.ts alongside source

## Component patterns
- One component per file, named to match the file (PascalCase)
- All data-fetching via useEffect + async function load() pattern
- Error and loading states required for every async operation
- No business logic in components — all DB access goes through API routes
- 'use client' directive required on any component using useState/useEffect

## Loading skeleton pattern
```tsx
if (loading) return (
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
```

## Error display pattern (Phase 1 tone)
```tsx
{error && (
  <div className="mx-5 mb-5 px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
    <p className="text-sm font-ui text-p1-brown">{error}</p>
  </div>
)}
```

## Deploy checklist — run in order after every fix
1. `npm run build` — must pass (ESLint + TypeScript run here)
2. `git add <changed files>` — never use `git add -A` (risk of committing .env)
3. `git commit -m "..."` 
4. `git push origin master master:main` — pushes to both branches (Vercel watches `main`)
5. `npx vercel --prod --scope aikanshs-projects` — **always run this**; git auto-deploy is unreliable
6. Confirm the Vercel output shows `▲ Aliased https://rasa-app-woad.vercel.app` before reporting done

## Known gotchas
- Never use `asChild` prop — @base-ui/react doesn't support it
- Never import from "shadcn/tailwind.css" — Tailwind v4 syntax, incompatible with v3
- Never query `.or('user_id.eq.null,...')` — passes "null" as UUID string. Use `.is('user_id', null)`
- Never chain `.finally()` on a Supabase PromiseLike — use async/await with try/catch/finally in useEffect
- Never import { Geist } from "next/font/google" — doesn't exist in Next.js 14
- Unused variables fail ESLint build — remove them (prefix _ only works for function params)
- Unescaped apostrophes in JSX fail ESLint — use &apos;
- Route handler `request` param — omit entirely if request body is never read
- getAnonId() is client-side only — never call in route handlers or server components

## Environment variables
| Variable | Where used | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Client + server | https://hdzzmeeflrtccxupxzhn.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client only | Public anon key |
| SUPABASE_SERVICE_ROLE_KEY | Server only — admin.ts | NEVER expose to client |
| ANTHROPIC_API_KEY | Server only — API routes | NEVER in NEXT_PUBLIC_ |
