---
name: nextjs-patterns
description: Next.js 14 App Router patterns for Rasa. Load for frontend and full-stack tasks.
---
# Next.js 14 App Router patterns for Rasa

## When to use Server vs Client components
| Need | Use |
|---|---|
| API route / DB access | Route handler in app/api/[route]/route.ts |
| User interaction, useState, useEffect | Client Component ('use client' at top) |
| Static or SSR page with no interactivity | Server Component (default — no directive) |
| Read anon_id from localStorage | Client Component only |
| Call Supabase admin client | Route handler only |

## Client component data fetching pattern (Rasa standard)
```tsx
'use client'
import { useEffect, useState } from 'react'
import { getAnonId } from '@/lib/anon'  // CLIENT ONLY

export default function PageName() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const anonId = getAnonId()
        const res = await fetch(`/api/resource?anon_id=${anonId}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Something went wrong'); return }
        setData(json.data)
      } catch {
        setError('Hmm, something went wrong. Give it one more try?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])
  // ...
}
```

## Route handler pattern
```ts
// app/api/resource/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { anon_id, field } = await request.json()
  if (!anon_id) return NextResponse.json({ error: 'Missing anon_id', code: 'MISSING_ANON_ID' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('table').select('*').eq('anon_id', anon_id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Database error', code: 'DB_ERROR' }, { status: 500 })

  return NextResponse.json({ data })
}
```

## Rasa-specific patterns
- All pages are client components ('use client') — no server component pages in Phase 1
- anon_id always retrieved client-side via getAnonId() from '@/lib/anon'
- Font: DM Sans loaded in app/layout.tsx as font-ui class
- Phase 1 nav: BottomNav.tsx — 5 tabs with p1-dark background
- OnboardingGuard.tsx in layout — redirects to /onboarding if no preferences row

## Build checklist (before every commit)
1. npm run build — ESLint runs at build time, must pass
2. npx tsc --noEmit — type check only
3. Stage specific files (never git add -A without reviewing)
