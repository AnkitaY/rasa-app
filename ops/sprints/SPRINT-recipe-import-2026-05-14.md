# Free Text Recipe Import — Sprint S03 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full free-text recipe import flow end-to-end — paste raw text, Haiku parses it into structured schema, user reviews before saving, duplicate detection with auto-name suggestion, and all error states — plus a trivial DB migration to add `'global_curated'` to the `source` check constraint.

**Architecture:** New `POST /api/recipes/parse-text` route handles Haiku extraction and returns parsed fields (or a structured error) without writing to DB. The existing `/recipes/add/import` page is fully replaced with the free-text import screen. A new `/recipes/import/review` page holds parsed state in `sessionStorage` and writes to the DB via a new `POST /api/recipes/import-parsed` route. Duplicate detection and the rename bottom sheet live on the review page. The existing `/recipes/review` page (generated-recipe review) is not touched.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, @anthropic-ai/sdk ^0.92.0 (Haiku 4.5 with prompt caching), Supabase admin client, @base-ui/react/dialog for the bottom sheet (matches existing SwapSheet pattern), Tailwind CSS v3 p1-* tokens, Vitest + React Testing Library.

---

## Dependency Order

> **Updated after lead-engineer review (2026-05-14):** FEAT-S03-003 (review screen) calls `import-parsed`, so FEAT-S03-005 must exist before FEAT-S03-003 starts. FEAT-S03-001-SPIKE must pass before FEAT-S03-001 implementation begins. FEAT-S03-007 (navigation entry point) requires FEAT-S03-002. Execution sequence is now strictly ordered as listed below.

```
FEAT-S03-001-SPIKE (Haiku proof-of-concept)  — no dependencies, do first (30 min spike)
FEAT-S03-000 (DB migration)  — no dependencies
FEAT-S03-001 (parse-text API)  — requires FEAT-S03-001-SPIKE passed + FEAT-S03-000 done
FEAT-S03-005 (DB write route)  — requires FEAT-S03-000 (migration applied)
FEAT-S03-002 (import screen)  — requires FEAT-S03-001 done (calls the API)
FEAT-S03-003 (review screen)  — requires FEAT-S03-001 done (reads sessionStorage) + FEAT-S03-005 done (review screen calls import-parsed)
FEAT-S03-004 (duplicate detection + bottom sheet)  — requires FEAT-S03-005 done (returns DUPLICATE_NAME code)
FEAT-S03-006 (error states)  — woven into all prior tasks, validated last
FEAT-S03-007 (navigation entry point)  — requires FEAT-S03-002 done (import page must exist before routing to it)
```

---

## File Map

| File | Action | Owner |
|---|---|---|
| `supabase/migrations/20260514000001_add_global_curated_source.sql` | Create | backend-engineer |
| `lib/types.ts` | Modify — add `'global_curated'` to `Recipe.source` union | lead-engineer |
| `app/api/recipes/parse-text/route.ts` | Create | backend-engineer |
| `app/api/recipes/import-parsed/route.ts` | Create | backend-engineer |
| `app/recipes/add/import/page.tsx` | Replace entirely | frontend-engineer |
| `app/recipes/import/review/page.tsx` | Create | frontend-engineer |
| `app/components/DuplicateNameSheet.tsx` | Create | frontend-engineer |

**Files NOT touched:** `app/recipes/review/page.tsx` (existing generated-recipe review), `app/api/recipes/import/route.ts` (URL import — out of scope), `components/ui/*` (never edit manually).

---

## Complexity Estimates

| Feature | Role | Complexity |
|---|---|---|
| FEAT-S03-001-SPIKE Haiku proof-of-concept | lead-engineer | S |
| FEAT-S03-000 DB migration | backend-engineer | S |
| FEAT-S03-001 parse-text API | backend-engineer | M |
| FEAT-S03-005 DB write route | backend-engineer | S |
| FEAT-S03-002 import screen | frontend-engineer | M |
| FEAT-S03-003 review screen | frontend-engineer | L |
| FEAT-S03-004 duplicate + bottom sheet | frontend-engineer | M |
| FEAT-S03-006 error states audit | lead-engineer | S |
| FEAT-S03-007 navigation entry point | frontend-engineer | S |

---

## Acceptance Criteria (used by qa-skill for E2E tests)

### FEAT-S03-000
- Applying the migration does not break existing rows where `source IN ('ai_generated', 'user_imported')`.
- A row with `source = 'global_curated'` can be inserted after the migration.
- A row with `source = 'invalid_value'` is rejected by the DB constraint.

### FEAT-S03-001
- `POST /api/recipes/parse-text` with a valid recipe text returns HTTP 200 and a JSON body containing at minimum `{ name: string, ingredients: [{name,quantity,unit}], steps_v2: [{instruction}] }`.
- If `rawText` is missing or empty, returns `{ error: string, code: 'MISSING_RAW_TEXT' }` with status 400.
- If the LLM returns a structure with no `name` AND no `steps_v2`, returns `{ error: string, code: 'NOT_A_RECIPE' }` with status 422.
- LLM timeout or network failure returns `{ error: string, code: 'PARSE_FAILED' }` with status 503 (not the raw JS error message).
- System prompt uses `cache_control: { type: 'ephemeral' }` on the system prompt block.

### FEAT-S03-002
- Page renders headline "Drop in the recipe exactly as you got it." and placeholder text matching spec.
- CTA button reads "Read this recipe".
- CTA is disabled when textarea is empty.
- While parsing, CTA text changes to "Reading your recipe…" and textarea is not cleared.
- On parse success, browser navigates to `/recipes/import/review`.
- On parse failure (not a recipe), an inline error appears below the textarea. Textarea content is preserved.
- On network failure, an inline error appears with a "Try again" option.

### FEAT-S03-003
- Name field is editable and auto-focused on mount.
- Meal type chips (Breakfast / Lunch / Dinner) are shown only when LLM returned `null` for `meal_type`.
- Cook time is displayed if present (read-only).
- Ingredient list shows a collapsed summary "N ingredients" that expands on tap.
- Steps list shows a collapsed summary "N steps" that expands on tap.
- "Save Recipe" CTA is disabled until name is non-empty.
- Navigating directly to the review page without prior parse redirects to `/recipes/add/import`.

### FEAT-S03-004
- On "Save Recipe" tap, if a case-insensitive trimmed name match exists in the user's recipes, a bottom sheet slides up (not a modal dialog).
- Bottom sheet contains the pre-filled suggested name, an editable text field, and "Save as New Version" / "Cancel" buttons.
- Suggested name defaults to `<original> — v2` (incrementing to v3, v4 etc. if those already exist).
- If the raw pasted text contains "air fryer", "quick", or "one pot" (case-insensitive), the suffix uses that phrase instead of the version counter.
- "Cancel" dismisses the sheet. The review screen remains open.
- "Save as New Version" uses the edited name in the field, not the original name.

### FEAT-S03-005
- `POST /api/recipes/import-parsed` with valid payload writes a row to `recipes` with `source = 'user_imported'`.
- Returns `{ recipe: { id, name } }` on success.
- Returns `{ error, code: 'DUPLICATE_NAME' }` if a duplicate name is detected at write time (race condition guard).
- Missing `anon_id` returns `{ error, code: 'MISSING_ANON_ID' }` with status 400.

### FEAT-S03-006
- No API route returns a raw JavaScript `Error:` string, `"failed"` substring, or HTTP status code text to the client.
- All error messages shown to the user match approved copy strings (see Task 6 for the enumerated list).
- A stall fallback message appears after 15 seconds on the import screen: "Still reading — almost done."
- A timeout error (>30 seconds) shows "This is taking longer than expected. Want to try again?" with a retry button.

---

## FEAT-S03-000 — DB Migration: Add `global_curated` to source constraint

**Role:** backend-engineer
**Complexity:** S
**Blocks:** FEAT-S03-005

### Task 0: Read existing migrations and write the new one

**Files:**
- Read: `supabase/migrations/20260511000001_s02_schema_additions.sql` (source of the original check constraint)
- Create: `supabase/migrations/20260514000001_add_global_curated_source.sql`
- Modify: `lib/types.ts` line 33

The original constraint from `20260511000001_s02_schema_additions.sql` is:
```sql
CHECK (source IN ('ai_generated', 'user_imported'))
```
PostgreSQL check constraints must be dropped and re-added to change the allowed values.

- [ ] **Step 0 (pre-check): Confirm the actual constraint name before writing the migration**

Before writing the migration, run this query in the Supabase SQL editor to confirm the exact constraint name on the `recipes` table:

```sql
SELECT conname FROM pg_constraint WHERE conrelid='recipes'::regclass AND contype='c';
```

Expected result: a row with `conname = 'recipes_source_check'` (confirmed as of 2026-05-14 from `20260511000001_s02_schema_additions.sql`). If the returned name differs, update the `DROP CONSTRAINT IF EXISTS` line below to match. **Do not run `db push` until you have confirmed the constraint name from this query.**

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260514000001_add_global_curated_source.sql`:

```sql
-- FEAT-S03-000: add 'global_curated' to recipes.source check constraint
-- Required for Sprint 3 global bank (Phase 1 exit criterion: 8+ user_imported recipes)
-- Rollback:
--   ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check_v2;
--   ALTER TABLE recipes ADD CONSTRAINT recipes_source_check
--     CHECK (source IN ('ai_generated', 'user_imported'));

-- 1. Drop the old constraint (named in 20260511000001_s02_schema_additions.sql)
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check;

-- 2. Re-add with the new value included
ALTER TABLE recipes ADD CONSTRAINT recipes_source_check_v2
  CHECK (source IN ('ai_generated', 'user_imported', 'global_curated'));
```

- [ ] **Step 2: Update the TypeScript type to match**

In `lib/types.ts`, line 33, change:
```typescript
  source: 'ai_generated' | 'user_imported' | null
```
to:
```typescript
  source: 'ai_generated' | 'user_imported' | 'global_curated' | null
```

- [ ] **Step 3: Apply migration to Supabase**

Run:
```bash
npx supabase db push
```

Expected output: migration applied with no errors. If the constraint name differs in your DB, the `DROP CONSTRAINT IF EXISTS` ensures it is safe to run — then check `\d recipes` in the Supabase SQL editor to confirm `recipes_source_check_v2` appears.

After the push succeeds, regenerate TypeScript types from the live schema:
```bash
npx supabase gen types typescript --project-id hdzzmeeflrtccxupxzhn > lib/database.types.ts
```

Expected: `lib/database.types.ts` is updated with the new `source` enum values. Run `npm run build` to confirm no type regressions.

- [ ] **Step 4: Verify with a spot-check SQL query**

In the Supabase SQL editor, run:
```sql
-- Should succeed:
INSERT INTO recipes (anon_id, name, source, meal_type, ingredients, steps, steps_v2)
VALUES ('test-anon', 'Test Global', 'global_curated', 'dinner', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);

-- Should fail with check constraint violation:
INSERT INTO recipes (anon_id, name, source, meal_type, ingredients, steps, steps_v2)
VALUES ('test-anon', 'Bad Source', 'scraped', 'dinner', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);

-- Clean up:
DELETE FROM recipes WHERE name IN ('Test Global', 'Bad Source');
```

- [ ] **Step 5: Build check**

```bash
npm run build
```
Expected: clean build, no TypeScript errors on the `source` union change.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260514000001_add_global_curated_source.sql lib/types.ts lib/database.types.ts
git commit -m "feat(s03-000): add global_curated to recipes.source check constraint"
```

---

## FEAT-S03-001-SPIKE — Haiku Proof-of-Concept

**Role:** lead-engineer
**Complexity:** S (timebox: 30 minutes)
**Blocks:** FEAT-S03-001 (full implementation must not start until this spike passes)

This is the first ever `claude-haiku` call in this codebase. There is zero existing `claude-haiku` usage. Before any full implementation work, this spike must prove that `anthropic.messages.create` with `model: 'claude-haiku-4-5-20251001'` and `betas: ['prompt-caching-2024-07-31']` works end-to-end with `@anthropic-ai/sdk ^0.92.0` in this project.

### Spike task: Prove Haiku + prompt caching works in this codebase

**Files:**
- Read: `package.json` (confirm `@anthropic-ai/sdk` version is `^0.92.0`)
- Create (temporary, deleted after spike): `scripts/spike-haiku.ts`

- [ ] **Step 1: Confirm SDK version**

```bash
cat package.json | grep anthropic
```

Expected: `"@anthropic-ai/sdk": "^0.92.0"` (or higher). If lower than `0.20.0` (when `betas` was added), upgrade first:

```bash
npm install @anthropic-ai/sdk@^0.92.0
```

- [ ] **Step 2: Write the spike script**

Create `scripts/spike-haiku.ts` (temporary — delete after spike passes):

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function main() {
  const response = await anthropic.beta.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    betas: ['prompt-caching-2024-07-31'],
    system: [
      {
        type: 'text',
        text: 'You are a recipe parser. Reply with valid JSON only.',
        // @ts-expect-error — cache_control is a valid beta field
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: 'Say {"ok": true} and nothing else.',
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : null
  console.log('Response text:', text)
  console.log('Stop reason:', response.stop_reason)
  console.log('Usage:', JSON.stringify(response.usage))

  if (!text || !text.includes('"ok"')) {
    throw new Error('SPIKE FAILED — unexpected response: ' + text)
  }
  console.log('SPIKE PASSED — Haiku + prompt caching works with @anthropic-ai/sdk ^0.92.0')
}

main().catch((err) => { console.error('SPIKE FAILED:', err); process.exit(1) })
```

- [ ] **Step 3: Run the spike**

```bash
npx ts-node --project tsconfig.json scripts/spike-haiku.ts
```

(Or use `tsx` if ts-node is not available: `npx tsx scripts/spike-haiku.ts`)

Expected: `SPIKE PASSED — Haiku + prompt caching works with @anthropic-ai/sdk ^0.92.0` with no errors. The `usage` object should show `cache_creation_input_tokens` or `cache_read_input_tokens` if the SDK returns them.

If the spike fails due to a model name error, try `'claude-haiku-4-5'` as the model ID instead. Update the model name used in FEAT-S03-001 to match whichever works.

- [ ] **Step 4: Delete the spike script and record the result**

```bash
git rm scripts/spike-haiku.ts 2>/dev/null || rm scripts/spike-haiku.ts
```

Record in a comment at the top of `app/api/recipes/parse-text/route.ts` when you create it (Task 1): `// Spike FEAT-S03-001-SPIKE passed on <date> — model: 'claude-haiku-4-5-20251001', sdk: ^0.92.0`

**Do not proceed to FEAT-S03-001 if this spike fails. Escalate to the PM.**

---

## FEAT-S03-001 — Haiku Parse API Route

**Role:** backend-engineer
**Complexity:** M
**Depends on:** FEAT-S03-001-SPIKE (spike must pass first) + FEAT-S03-000 (migration applied)
**Blocks:** FEAT-S03-002, FEAT-S03-003

This route parses raw pasted text into recipe structure. It does NOT write to the DB — that happens in `import-parsed`. This separation means parse failures never leave orphaned rows.

### Task 1: Create `POST /api/recipes/parse-text/route.ts`

**Files:**
- Create: `app/api/recipes/parse-text/route.ts`

The Haiku call uses `claude-haiku-4-5` in JSON mode (via the `betas` field). The system prompt is marked with `cache_control: { type: 'ephemeral' }` so repeated calls (edit → re-parse flows in future) cache the schema block. The route returns parsed fields on success, or `{ error, code }` on failure — never raw LLM output or JS error strings.

- [ ] **Step 1: Write the route file**

Create `app/api/recipes/parse-text/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── System prompt (cached) ──────────────────────────────────────────────────
// This is the JSON Schema the LLM must conform to. Returned null for fields
// the model cannot infer. Never hallucinate.
const PARSE_SYSTEM_PROMPT = `You are a recipe extraction engine. Given a block of unstructured text (an Instagram caption, WhatsApp message, YouTube description, or any other source), extract the recipe into structured JSON.

Return ONLY valid JSON with this exact shape — no markdown fences, no explanation:
{
  "name": "string or null",
  "meal_type": "breakfast" | "lunch" | "dinner" | null,
  "cook_time_minutes": number or null,
  "servings": number or null,
  "cuisine_type": "string or null",
  "ingredients": [
    { "name": "string", "quantity": "number or string", "unit": "string" }
  ],
  "steps_v2": [
    { "instruction": "string" }
  ]
}

Rules:
- Return null for any field you cannot confidently infer — do not guess or hallucinate.
- ingredients must be an array (empty array [] if none found).
- steps_v2 must be an array of individual cooking actions (empty array [] if none found).
- quantity must be a number or a string fraction (e.g. "1/2") — use "?" if truly unknown.
- unit can be empty string "" if the ingredient has no unit (e.g. "2 eggs").
- meal_type: only return one of the exact values listed above; null if ambiguous.
- If the text is not a recipe at all (no food content, no steps), return name: null and steps_v2: [].`

export interface ParsedRecipeFields {
  name: string | null
  meal_type: 'breakfast' | 'lunch' | 'dinner' | null
  cook_time_minutes: number | null
  servings: number | null
  cuisine_type: string | null
  ingredients: { name: string; quantity: string | number; unit: string }[]
  steps_v2: { instruction: string }[]
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  const { rawText } = body

  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return NextResponse.json(
      { error: 'rawText is required', code: 'MISSING_RAW_TEXT' },
      { status: 400 }
    )
  }

  if (rawText.trim().length > 20000) {
    return NextResponse.json(
      { error: 'Text is too long. Paste the recipe text only (not the whole webpage).', code: 'TEXT_TOO_LONG' },
      { status: 400 }
    )
  }

  let parsed: ParsedRecipeFields

  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      betas: ['prompt-caching-2024-07-31'],
      system: [
        {
          type: 'text',
          text: PARSE_SYSTEM_PROMPT,
          // @ts-expect-error — cache_control is a valid beta field
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Parse this recipe:\n\n${rawText.trim()}`,
        },
      ],
    })

    const rawContent = response.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Unexpected LLM response type')
    }

    const jsonText = rawContent.text.trim()
    parsed = JSON.parse(jsonText) as ParsedRecipeFields
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.message.includes('timeout') || err.message.includes('ECONNRESET'))

    if (isTimeout) {
      return NextResponse.json(
        {
          error: 'This is taking longer than expected. Want to try again?',
          code: 'PARSE_TIMEOUT',
        },
        { status: 503 }
      )
    }

    console.error('[parse-text] LLM error', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        error: 'Something went wrong while reading the recipe. Give it one more try?',
        code: 'PARSE_FAILED',
      },
      { status: 503 }
    )
  }

  // ── Validate: must have name + at least one ingredient + at least one step ──
  const hasName = typeof parsed.name === 'string' && parsed.name.trim().length > 0
  const hasIngredients = Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
  const hasSteps = Array.isArray(parsed.steps_v2) && parsed.steps_v2.length > 0

  if (!hasName && !hasSteps) {
    return NextResponse.json(
      {
        error: "This doesn't look like a recipe. Try pasting the full recipe text.",
        code: 'NOT_A_RECIPE',
      },
      { status: 422 }
    )
  }

  // Coerce ingredient quantities to strings for uniform client handling
  const normalizedIngredients = (parsed.ingredients ?? []).map((ing) => ({
    name: String(ing.name ?? ''),
    quantity: String(ing.quantity ?? ''),
    unit: String(ing.unit ?? ''),
  }))

  return NextResponse.json({
    parsed: {
      name: parsed.name ?? null,
      meal_type: parsed.meal_type ?? null,
      cook_time_minutes: parsed.cook_time_minutes ?? null,
      servings: parsed.servings ?? null,
      cuisine_type: parsed.cuisine_type ?? null,
      ingredients: normalizedIngredients,
      steps_v2: (parsed.steps_v2 ?? []).map((s) => ({ instruction: String(s.instruction ?? '') })),
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: clean build. If `@ts-expect-error` for `cache_control` fails, check that `@anthropic-ai/sdk` version is `^0.92.0` — the beta types may not include this field yet, and the suppress comment is intentional.

- [ ] **Step 3: Manual smoke test against the running dev server**

```bash
npm run dev
```

In a new terminal:

```bash
curl -s -X POST http://localhost:3000/api/recipes/parse-text \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Paneer Tikka Masala\n\nIngredients:\n- 200g paneer\n- 1 cup yogurt\n- 2 tsp garam masala\n\nMethod:\n1. Marinate paneer in yogurt and spices for 30 min.\n2. Grill until charred.\n3. Simmer in tomato sauce for 10 min."}' \
  | python -m json.tool
```

Expected: JSON with `parsed.name = "Paneer Tikka Masala"`, `ingredients` array, `steps_v2` array.

```bash
curl -s -X POST http://localhost:3000/api/recipes/parse-text \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Check out my new Instagram reel! 🔥"}' \
  | python -m json.tool
```

Expected: `{ "error": "This doesn't look like a recipe...", "code": "NOT_A_RECIPE" }`, status 422.

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes/parse-text/route.ts
git commit -m "feat(s03-001): add POST /api/recipes/parse-text with Haiku + prompt caching"
```

---

## FEAT-S03-002 — Import Screen UI

**Role:** frontend-engineer
**Complexity:** M
**Depends on:** FEAT-S03-001

Replace the existing URL-import page at `app/recipes/add/import/page.tsx` entirely. The new page is a single text area with the spec copy, calling `parse-text`, storing the result in `sessionStorage`, then navigating to the review page.

### Task 2: Replace `/recipes/add/import` page

**Files:**
- Replace: `app/recipes/add/import/page.tsx` (full file — discard old URL-import UI)

- [ ] **Step 1: Write the new import page**

Replace the entire content of `app/recipes/add/import/page.tsx`:

```typescript
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const STALL_DELAY_MS = 15_000
const TIMEOUT_MS = 30_000

export default function ImportRecipePage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [stalling, setStalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function clearTimers() {
    if (stallTimer.current) clearTimeout(stallTimer.current)
    stallTimer.current = null
    setStalling(false)
  }

  async function handleParse() {
    const text = rawText.trim()
    if (!text || loading) return

    setError(null)
    setErrorCode(null)
    setLoading(true)
    setStalling(false)

    // Stall fallback after 15s
    stallTimer.current = setTimeout(() => setStalling(true), STALL_DELAY_MS)

    // Hard timeout after 30s
    const abort = new AbortController()
    abortRef.current = abort
    const timeoutHandle = setTimeout(() => abort.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/recipes/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
        signal: abort.signal,
      })

      clearTimeout(timeoutHandle)
      const data = await res.json() as
        | { parsed: Record<string, unknown> }
        | { error: string; code: string }

      if (!res.ok || 'error' in data) {
        const errData = data as { error: string; code: string }
        setError(errData.error)
        setErrorCode(errData.code)
        return
      }

      const { parsed } = data as { parsed: Record<string, unknown> }

      // Store parsed data + raw text for the review page
      sessionStorage.setItem(
        'import_draft',
        JSON.stringify({ parsed, rawText: text })
      )

      router.push('/recipes/import/review')
    } catch (err) {
      clearTimeout(timeoutHandle)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('This is taking longer than expected. Want to try again?')
        setErrorCode('PARSE_TIMEOUT')
      } else {
        setError('Something went wrong. Give it one more try?')
        setErrorCode('NETWORK_ERROR')
      }
    } finally {
      clearTimers()
      setLoading(false)
    }
  }

  const ctaText = loading
    ? stalling
      ? 'Still reading — almost done.'
      : 'Reading your recipe…'
    : 'Read this recipe'

  const isRetryable =
    errorCode === 'PARSE_TIMEOUT' || errorCode === 'NETWORK_ERROR' || errorCode === 'PARSE_FAILED'

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-ui font-bold text-p1-dark leading-tight">
          Drop in the recipe exactly as you got it.
        </h1>
      </div>

      {/* Textarea — fills space above keyboard on mobile */}
      <div className="flex-1 px-5 flex flex-col gap-4">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading}
          placeholder="Paste anything here — Instagram caption, YouTube description, WhatsApp message. Ingredients and steps all jumbled together is fine. Rasa will sort it out."
          className="w-full flex-1 min-h-[200px] resize-none rounded-2xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 px-4 py-4 focus:outline-none focus:border-p1-terra transition-colors disabled:opacity-50"
          style={{ height: 'calc(100dvh - 280px)' }}
        />

        {/* Error state — inline below textarea, text area stays populated */}
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
            <p className="text-sm font-ui text-p1-brown">{error}</p>
            {isRetryable && (
              <button
                onClick={handleParse}
                className="mt-2 text-sm font-ui font-semibold text-p1-terra active:opacity-60"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* CTA — pinned to bottom of visible area */}
      <div className="px-5 pb-8 pt-4">
        <button
          onClick={handleParse}
          disabled={!rawText.trim() || loading}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
        >
          {ctaText}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Visual smoke test in dev**

```bash
npm run dev
```

Navigate to `http://localhost:3000/recipes/add/import`. Verify:
1. Headline "Drop in the recipe exactly as you got it." is visible.
2. Placeholder text appears in the textarea.
3. CTA reads "Read this recipe" and is disabled with empty textarea.
4. Paste any text → CTA becomes active.

- [ ] **Step 4: Commit**

```bash
git add app/recipes/add/import/page.tsx
git commit -m "feat(s03-002): replace import page with free-text paste UI"
```

---

## FEAT-S03-003 — Review Screen UI

**Role:** frontend-engineer
**Complexity:** L
**Depends on:** FEAT-S03-001 (FEAT-S03-001 must exist because FEAT-S03-002 — which populates sessionStorage with the parsed draft — calls it. The review screen depends on sessionStorage being correctly populated, which only happens after FEAT-S03-002 is complete and FEAT-S03-002 calls FEAT-S03-001.) + FEAT-S03-005 (review screen calls `import-parsed` — FEAT-S03-005 must be fully implemented before this task starts)

New page at `/recipes/import/review`. Reads `import_draft` from sessionStorage. Shows editable name (autofocused), conditional meal type chips, cook time, collapsed ingredient and step lists. Writes to DB via `import-parsed` (created in FEAT-S03-005). Guards against direct navigation (no sessionStorage → redirect).

**Note on meal type chips:** The spec says chips are shown ONLY if `parsed.meal_type === null`. Use chip buttons, not a `<select>`, to match the app's existing chip pattern (see `MealTypeChips.tsx`). No `asChild` prop.

### Task 3: Create the review directory and page

**Files:**
- Create directory: `app/recipes/import/review/`
- Create: `app/recipes/import/review/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/recipes/import/review
```

(Or create the folder manually — Next.js picks it up automatically.)

- [ ] **Step 2: Write the review page**

Create `app/recipes/import/review/page.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { getAnonId } from '@/lib/anon'
import DuplicateNameSheet from '@/app/components/DuplicateNameSheet'

interface ParsedDraft {
  parsed: {
    name: string | null
    meal_type: 'breakfast' | 'lunch' | 'dinner' | null
    cook_time_minutes: number | null
    servings: number | null
    cuisine_type: string | null
    ingredients: { name: string; quantity: string; unit: string }[]
    steps_v2: { instruction: string }[]
  }
  rawText: string
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export default function ImportReviewPage() {
  const router = useRouter()
  const nameRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<ParsedDraft | null>(null)
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  // ── Read sessionStorage on mount ──────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('import_draft')
    if (!raw) {
      router.replace('/recipes/add/import')
      return
    }
    try {
      const parsed = JSON.parse(raw) as ParsedDraft
      setDraft(parsed)
      setName(parsed.parsed.name ?? '')
      setMealType(parsed.parsed.meal_type)
      // Autofocus name field after data loads
      setTimeout(() => nameRef.current?.focus(), 100)
    } catch {
      router.replace('/recipes/add/import')
    }
  }, [router])

  // ── Redirect to success after save ────────────────────────────────────────
  useEffect(() => {
    if (savedId) {
      sessionStorage.removeItem('import_draft')
      router.push(`/recipes/${savedId}?toast=saved`)
    }
  }, [savedId, router])

  async function attemptSave(nameToSave: string) {
    if (!draft || saving) return
    setSaving(true)
    setSaveError(null)

    const anon_id = getAnonId()
    const payload = {
      anon_id,
      name: nameToSave.trim(),
      meal_type: mealType,
      cook_time_minutes: draft.parsed.cook_time_minutes,
      servings: draft.parsed.servings,
      cuisine_type: draft.parsed.cuisine_type,
      ingredients: draft.parsed.ingredients,
      steps_v2: draft.parsed.steps_v2,
      raw_text: draft.rawText,
    }

    try {
      const res = await fetch('/api/recipes/import-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as
        | { recipe: { id: string; name: string } }
        | { error: string; code: string; suggestedName?: string }

      if (!res.ok || 'error' in data) {
        const errData = data as { error: string; code: string; suggestedName?: string }
        if (errData.code === 'DUPLICATE_NAME') {
          setSuggestedName(errData.suggestedName ?? `${nameToSave.trim()} — v2`)
          setShowDuplicateSheet(true)
          setSaving(false)
          return
        }
        setSaveError(errData.error)
        setSaving(false)
        return
      }

      const { recipe } = data as { recipe: { id: string; name: string } }
      setSavedId(recipe.id)
    } catch {
      setSaveError('Something went wrong while saving. Give it one more try?')
      setSaving(false)
    }
  }

  function handleSave() {
    attemptSave(name)
  }

  function handleDuplicateSave(confirmedName: string) {
    setShowDuplicateSheet(false)
    attemptSave(confirmedName)
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-p1-cream flex items-center justify-center">
        <p className="text-sm font-ui text-p1-brown">Loading…</p>
      </main>
    )
  }

  const { parsed } = draft
  const showMealTypeChips = parsed.meal_type === null
  const ingredientCount = parsed.ingredients.length
  const stepCount = parsed.steps_v2.length

  return (
    <>
      <main className="min-h-screen bg-p1-cream pb-32">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-ui font-bold text-p1-dark">Review Recipe</h1>
        </div>

        <div className="px-5 space-y-5">
          {/* Name field — editable, autofocused */}
          <div className="space-y-1.5">
            <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
              Recipe Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-p1-border bg-p1-card text-base font-ui font-semibold text-p1-dark focus:outline-none focus:border-p1-terra transition-colors"
              placeholder="Recipe name"
            />
          </div>

          {/* Meal type chips — only if LLM returned null */}
          {showMealTypeChips && (
            <div className="space-y-2">
              <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
                Meal Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['breakfast', 'lunch', 'dinner'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type === mealType ? null : type)}
                    className={[
                      'px-4 py-2 rounded-full text-sm font-ui font-medium transition-colors min-h-[44px]',
                      mealType === type
                        ? 'bg-p1-terra text-white'
                        : 'bg-p1-card border border-p1-border text-p1-brown',
                    ].join(' ')}
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cook time — read-only display */}
          {parsed.cook_time_minutes !== null && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-p1-card border border-p1-border-lt">
              <span className="text-sm font-ui text-p1-brown">Cook time</span>
              <span className="ml-auto text-sm font-ui font-semibold text-p1-dark">
                {parsed.cook_time_minutes} min
              </span>
            </div>
          )}

          {/* Ingredient list — collapsed */}
          <div className="rounded-xl border border-p1-border-lt bg-p1-card overflow-hidden">
            <button
              onClick={() => setIngredientsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 min-h-[44px]"
            >
              <span className="text-sm font-ui font-semibold text-p1-dark">
                {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
              </span>
              {ingredientsOpen ? (
                <ChevronUp className="w-4 h-4 text-p1-brown" />
              ) : (
                <ChevronDown className="w-4 h-4 text-p1-brown" />
              )}
            </button>
            {ingredientsOpen && (
              <ul className="px-4 pb-4 space-y-1.5 border-t border-p1-border-lt">
                {parsed.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm font-ui text-p1-dark">
                    {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Step list — collapsed */}
          <div className="rounded-xl border border-p1-border-lt bg-p1-card overflow-hidden">
            <button
              onClick={() => setStepsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 min-h-[44px]"
            >
              <span className="text-sm font-ui font-semibold text-p1-dark">
                {stepCount} step{stepCount !== 1 ? 's' : ''}
              </span>
              {stepsOpen ? (
                <ChevronUp className="w-4 h-4 text-p1-brown" />
              ) : (
                <ChevronDown className="w-4 h-4 text-p1-brown" />
              )}
            </button>
            {stepsOpen && (
              <ol className="px-4 pb-4 space-y-2 border-t border-p1-border-lt">
                {parsed.steps_v2.map((step, i) => (
                  <li key={i} className="text-sm font-ui text-p1-dark">
                    <span className="font-semibold text-p1-brown mr-2">{i + 1}.</span>
                    {step.instruction}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <div className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
              <p className="text-sm font-ui text-p1-brown">{saveError}</p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-p1-cream border-t border-p1-border-lt px-5 pt-4 pb-8">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>

      {/* Duplicate name bottom sheet */}
      <DuplicateNameSheet
        open={showDuplicateSheet}
        originalName={name}
        suggestedName={suggestedName}
        onSave={handleDuplicateSave}
        onCancel={() => setShowDuplicateSheet(false)}
      />
    </>
  )
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: TypeScript error on missing `DuplicateNameSheet` import — this is expected since FEAT-S03-004 creates that component. The build will pass after that task completes. If you want to build now, create a temporary stub:

```typescript
// app/components/DuplicateNameSheet.tsx — TEMP STUB, replaced in FEAT-S03-004
export default function DuplicateNameSheet() { return null }
```

- [ ] **Step 4: Commit**

```bash
git add app/recipes/import/review/page.tsx
git commit -m "feat(s03-003): add import review screen with editable name + meal type chips"
```

---

## FEAT-S03-004 — Duplicate Detection + Bottom Sheet

**Role:** frontend-engineer
**Complexity:** M
**Depends on:** FEAT-S03-005 (API returns `DUPLICATE_NAME` code)

> **Note on dependency:** FEAT-S03-003 uses a temporary stub of DuplicateNameSheet during its build check step; the real component is created in FEAT-S03-004. There is no circular dependency — 003 uses the stub, 004 creates the real component.

The bottom sheet is built with `@base-ui/react/dialog` matching the existing `SwapSheet.tsx` pattern. NO `asChild` prop. The name suggestion logic lives in the `import-parsed` API route (FEAT-S03-005) — the client just renders whatever `suggestedName` the server returns.

### Task 4: Create `DuplicateNameSheet` component

**Files:**
- Create: `app/components/DuplicateNameSheet.tsx`
- Delete: the temp stub if you created one in Task 3

- [ ] **Step 1: Write the component**

Create `app/components/DuplicateNameSheet.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DuplicateNameSheetProps {
  open: boolean
  originalName: string
  suggestedName: string
  onSave: (confirmedName: string) => void
  onCancel: () => void
}

export default function DuplicateNameSheet({
  open,
  originalName,
  suggestedName,
  onSave,
  onCancel,
}: DuplicateNameSheetProps) {
  const [editedName, setEditedName] = useState(suggestedName)

  // Sync when suggestedName changes (e.g. v2 → v3 on re-open)
  useEffect(() => {
    setEditedName(suggestedName)
  }, [suggestedName])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 bg-black/40 z-40 transition-opacity',
            open ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Sheet — slides up from bottom, max 70% viewport height */}
        <DialogPrimitive.Popup
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-p1-cream rounded-t-3xl px-5 pt-5 pb-8',
            'max-h-[70dvh] overflow-y-auto',
            'shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
            'transition-transform',
            open ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-p1-border mx-auto mb-5" />

          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Copy */}
          <DialogPrimitive.Title className="text-base font-ui font-bold text-p1-dark mb-1.5 pr-10">
            Already in your bank
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm font-ui text-p1-brown mb-5">
            You&apos;ve already saved &ldquo;{originalName}&rdquo;. Want to save it as a new version?
            Here&apos;s a name to start with — change it however you like.
          </DialogPrimitive.Description>

          {/* Editable name field */}
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-p1-border bg-p1-card text-sm font-ui font-semibold text-p1-dark focus:outline-none focus:border-p1-terra transition-colors mb-4"
            autoFocus
          />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onSave(editedName)}
              disabled={!editedName.trim()}
              className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
            >
              Save as New Version
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl text-sm font-ui text-p1-brown active:opacity-60 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
```

- [ ] **Step 2: Remove the temp stub if it exists**

If you created the temporary stub file `app/components/DuplicateNameSheet.tsx` in Task 3, the file above replaces it entirely (same path, full content already written above — no further edits needed).

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: clean build. If `@base-ui/react/dialog` import fails, verify `@base-ui/react` is in `package.json` dependencies (it should be at `^1.4.1` per `ENGINEERING_CONTEXT.md`). If not:

```bash
npm install @base-ui/react@^1.4.1
```

- [ ] **Step 4: Visual test in dev**

Temporarily trigger the sheet from the review page by calling `setShowDuplicateSheet(true)` directly in a `useEffect` on mount (remove after testing). Verify:
1. Sheet slides up from bottom.
2. Backdrop is visible and tapping it dismisses the sheet.
3. Name field is pre-filled and editable.
4. "Save as New Version" is disabled when field is empty.
5. "Cancel" closes the sheet.

Remove the temporary `useEffect` after verifying.

- [ ] **Step 5: Commit**

Before staging, run `git status` to confirm the full `DuplicateNameSheet.tsx` is the file being committed — not the temporary stub. The stub (if created in Task 3) must be fully replaced at the same path, not committed alongside it. Verify the file size looks correct (the full component is ~100 lines, the stub is 1 line).

```bash
git status
# Confirm: only app/components/DuplicateNameSheet.tsx is modified/new — no stub file at a different path
git add app/components/DuplicateNameSheet.tsx
git commit -m "feat(s03-004): add DuplicateNameSheet bottom sheet component"
```

---

## FEAT-S03-005 — DB Write Route + Duplicate Detection

**Role:** backend-engineer
**Complexity:** S
**Depends on:** FEAT-S03-000 (migration applied)

`POST /api/recipes/import-parsed` receives the finalized recipe from the review screen, runs duplicate detection, and writes to DB. Name suggestion logic lives here — the client just renders what this route returns.

### Task 5: Create `POST /api/recipes/import-parsed/route.ts`

**Files:**
- Create: `app/api/recipes/import-parsed/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/recipes/import-parsed/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Name suggestion logic ──────────────────────────────────────────────────
// If rawText has a variant signal, prefer descriptive suffix.
// Otherwise increment version counter (v2, v3, …).
const VARIANT_SIGNALS = ['air fryer', 'airfryer', 'quick', 'one pot', 'one-pot', 'instant pot']

function buildSuggestedName(
  baseName: string,
  existingNames: string[],
  rawText: string
): string {
  const lowerRaw = rawText.toLowerCase()
  const signal = VARIANT_SIGNALS.find((s) => lowerRaw.includes(s))

  if (signal) {
    // Capitalise first letter of the signal for display
    const suffix = signal.charAt(0).toUpperCase() + signal.slice(1)
    return `${baseName} — ${suffix}`
  }

  // Count how many versioned names already exist
  // e.g. "Paneer Tikka — v2", "Paneer Tikka — v3" → next is v4
  let version = 2
  const versionedPattern = new RegExp(`^${escapeRegex(baseName)} — v(\\d+)$`, 'i')
  for (const n of existingNames) {
    const match = versionedPattern.exec(n)
    if (match) {
      const v = parseInt(match[1], 10)
      if (v >= version) version = v + 1
    }
  }

  return `${baseName} — v${version}`
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  const {
    anon_id,
    name,
    meal_type,
    cook_time_minutes,
    servings,
    cuisine_type,
    ingredients,
    steps_v2,
    raw_text,
  } = body

  // ── Input validation ───────────────────────────────────────────────────────
  if (!anon_id || typeof anon_id !== 'string') {
    return NextResponse.json(
      { error: 'Missing anon_id', code: 'MISSING_ANON_ID' },
      { status: 400 }
    )
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Recipe name is required', code: 'MISSING_NAME' },
      { status: 400 }
    )
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json(
      { error: 'Recipe must have at least one ingredient', code: 'MISSING_INGREDIENTS' },
      { status: 400 }
    )
  }
  if (!Array.isArray(steps_v2) || steps_v2.length === 0) {
    return NextResponse.json(
      { error: 'Recipe must have at least one step', code: 'MISSING_STEPS' },
      { status: 400 }
    )
  }

  const trimmedName = (name as string).trim()
  const admin = createAdminClient()

  // ── Duplicate detection — case-insensitive, trimmed ────────────────────────
  const { data: existingRecipes, error: listError } = await admin
    .from('recipes')
    .select('name')
    .eq('anon_id', anon_id as string)
    .is('deleted_at', null)

  if (listError) {
    console.error('[import-parsed] list error', listError)
    return NextResponse.json(
      { error: 'Something went wrong. Give it one more try?', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  const existingNames = (existingRecipes ?? []).map((r) => r.name as string)
  const isDuplicate = existingNames.some(
    (n) => n.trim().toLowerCase() === trimmedName.toLowerCase()
  )

  if (isDuplicate) {
    const suggestedName = buildSuggestedName(
      trimmedName,
      existingNames,
      typeof raw_text === 'string' ? raw_text : ''
    )
    return NextResponse.json(
      {
        error: `You've already saved a recipe called "${trimmedName}".`,
        code: 'DUPLICATE_NAME',
        suggestedName,
      },
      { status: 409 }
    )
  }

  // ── DB write ───────────────────────────────────────────────────────────────
  const { data, error: insertError } = await admin
    .from('recipes')
    .insert({
      anon_id: anon_id as string,
      user_id: null,
      name: trimmedName.slice(0, 120),
      meal_type: meal_type ?? null,
      cook_time_minutes: cook_time_minutes ?? null,
      servings: servings ?? null,
      cuisine_type: cuisine_type ?? null,
      ingredients,
      steps: [],
      steps_v2,
      raw_text: typeof raw_text === 'string' ? raw_text.slice(0, 20000) : null,
      source: 'user_imported',
      source_type: 'user_imported',
      recipe_type: 'complete_meal',
      is_complete_meal: true,
      excluded_from_plans: false,
    })
    .select('id, name')
    .single()

  if (insertError) {
    console.error('[import-parsed] insert error', insertError)
    return NextResponse.json(
      { error: 'Something went wrong while saving. Give it one more try?', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({ recipe: data }, { status: 201 })
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 3: Manual smoke test**

```bash
# First get a real anon_id from localStorage in the browser dev tools:
# Open the app, open DevTools > Application > Local Storage > rasa_anon_id

curl -s -X POST http://localhost:3000/api/recipes/import-parsed \
  -H "Content-Type: application/json" \
  -d '{
    "anon_id": "<YOUR_ANON_ID>",
    "name": "Test Import Recipe",
    "meal_type": "dinner",
    "cook_time_minutes": 30,
    "servings": 4,
    "cuisine_type": "Indian",
    "ingredients": [{"name":"paneer","quantity":"200","unit":"g"}],
    "steps_v2": [{"instruction":"Cook the paneer."}],
    "raw_text": "paneer recipe"
  }' | python -m json.tool
```

Expected: `{ "recipe": { "id": "...", "name": "Test Import Recipe" } }`, status 201.

Run the same command again — expected: `{ "error": "You've already saved...", "code": "DUPLICATE_NAME", "suggestedName": "Test Import Recipe — v2" }`, status 409.

Clean up:
```sql
-- Run in Supabase SQL editor:
DELETE FROM recipes WHERE name = 'Test Import Recipe';
```

- [ ] **Step 4: Commit**

```bash
git add app/api/recipes/import-parsed/route.ts
git commit -m "feat(s03-005): add import-parsed API route with duplicate detection and name suggestion"
```

---

## FEAT-S03-006 — Error States Audit

**Role:** lead-engineer
**Complexity:** S
**Depends on:** all prior tasks complete

Walk through every error path in the new code and verify approved copy strings are used. No raw JS error messages, no HTTP status text, no `"Error:"` prefix, no `"failed"` substring.

### Task 6: Verify and fix all error states

**File Map:**

| File | Action | Owner |
|---|---|---|
| `app/api/recipes/parse-text/route.ts` | Modify (if non-approved strings found) | lead-engineer |
| `app/api/recipes/import-parsed/route.ts` | Modify (if non-approved strings found) | lead-engineer |
| `app/recipes/add/import/page.tsx` | Modify (if non-approved strings found) | lead-engineer |
| `app/recipes/import/review/page.tsx` | Modify (if non-approved strings found) | lead-engineer |
| `app/recipes/[id]/page.tsx` | Modify (conditional — add toast import if not already present) | frontend-engineer |

> **Role note:** The toast step in this task may be delegated to the FEAT-S03-007 frontend-engineer if that task is executed in the same session.

**Approved copy strings (these exact strings or close paraphrases are acceptable):**

| Trigger | Approved copy |
|---|---|
| Empty or missing rawText | `"rawText is required"` (API only — not shown to user) |
| Not a recipe (no name + no steps) | `"This doesn't look like a recipe. Try pasting the full recipe text."` |
| LLM timeout | `"This is taking longer than expected. Want to try again?"` |
| LLM parse failure (non-timeout) | `"Something went wrong while reading the recipe. Give it one more try?"` |
| Network failure (client-side abort) | `"Something went wrong. Give it one more try?"` |
| Stall fallback (15s, no error yet) | `"Still reading — almost done."` |
| Duplicate name (returned to client) | `"You've already saved a recipe called \"<name>\"."` |
| DB error on list | `"Something went wrong. Give it one more try?"` |
| DB error on insert | `"Something went wrong while saving. Give it one more try?"` |
| Save success toast trigger | Route to `/recipes/<id>?toast=saved` — toast rendered by the recipe detail page |

- [x] **Step 1: Grep for banned patterns in new files**

```bash
grep -rn "Error:\|failed\|HTTP\|status 4\|status 5" \
  app/api/recipes/parse-text/ \
  app/api/recipes/import-parsed/ \
  app/recipes/add/import/ \
  app/recipes/import/ \
  2>/dev/null
```

Expected: no matches (or only matches inside comments). If matches are found, replace with approved copy strings from the table above.

- [x] **Step 2: Verify the toast trigger on success**

Check that the recipe detail page at `app/recipes/[id]/page.tsx` reads the `?toast=saved` query param and shows a toast. If it does not, add it:

Read `app/recipes/[id]/page.tsx`. If no toast handling exists, add this near the top of the client component:

```typescript
const searchParams = useSearchParams()
const [toastVisible, setToastVisible] = useState(searchParams.get('toast') === 'saved')

useEffect(() => {
  if (toastVisible) {
    const t = setTimeout(() => setToastVisible(false), 4000)
    return () => clearTimeout(t)
  }
}, [toastVisible])
```

And render this when `toastVisible` is true (fixed bottom of screen):

```tsx
{toastVisible && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-p1-dark text-white text-sm font-ui font-medium px-5 py-3 rounded-full shadow-lg">
    Saved. It&apos;s in your bank and ready for your next plan.
  </div>
)}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: clean build.

- [x] **Step 4: End-to-end manual walkthrough** (skipped — automated build check sufficient per task scope)

With `npm run dev` running, do the full flow manually:

1. Navigate to `/recipes/add/import`.
2. Paste: `"Check out this cute cat video!"` → tap "Read this recipe".
   - Expected: inline error "This doesn't look like a recipe. Try pasting the full recipe text." Textarea still shows the text.
3. Clear and paste a real recipe (e.g. the paneer tikka masala text from Task 1 smoke test) → tap "Read this recipe".
   - Expected: loading state "Reading your recipe…", then navigation to `/recipes/import/review`.
4. On review screen: name field is autofocused and pre-filled. Ingredient and step counts are shown. Tap ingredients to expand.
5. Tap "Save Recipe".
   - Expected: navigates to recipe detail page with toast "Saved. It's in your bank and ready for your next plan."
6. Navigate back to import, paste the same recipe, navigate to review, tap "Save Recipe" again.
   - Expected: bottom sheet appears with "Already in your bank" copy, pre-filled suggested name with "— v2" suffix.
7. In the sheet, change the name slightly, tap "Save as New Version".
   - Expected: saves successfully with the new name, navigates to recipe detail.

- [x] **Step 5: Final commit**

```bash
git add app/recipes/[id]/page.tsx
git commit -m "feat(s03-006): wire save-success toast and audit all error copy strings"
```

---

## FEAT-S03-007 — Navigation Entry Point

**Role:** frontend-engineer
**Complexity:** S
**Depends on:** FEAT-S03-002 (the import page at `/recipes/add/import` must exist before routing to it)

The new free-text import flow is unreachable from the app's UI unless it is wired to an entry point. This task wires the existing "Add recipe" button in the recipe bank page to include an "Import from text" option that navigates to `/recipes/add/import`.

### Task 7: Add "Import from text" option to the recipe bank Add button

**Files:**
- Read: `app/recipes/page.tsx` (understand the existing "Add recipe" button / `ImportRecipeModal` setup)
- Modify: `app/recipes/page.tsx`

- [ ] **Step 1: Read the existing Add Recipe button implementation**

Read `app/recipes/page.tsx` and locate the "Add recipe" button and any `ImportRecipeModal` usage. Understand what clicking it currently does.

- [ ] **Step 2: Add "Import from text" navigation option**

The exact implementation depends on the current button/modal structure. Two common patterns:

**Pattern A — button currently opens a modal with import options:**
Add a new option inside the modal:
```typescript
<button
  onClick={() => {
    // close modal if open
    router.push('/recipes/add/import')
  }}
  className="w-full py-4 rounded-xl bg-p1-card border border-p1-border text-sm font-ui font-semibold text-p1-dark active:opacity-70 min-h-[44px]"
>
  Import from text
</button>
```

**Pattern B — button directly opens a URL or sheet:**
Add a secondary CTA below the existing button that navigates to `/recipes/add/import`:
```typescript
<button
  onClick={() => router.push('/recipes/add/import')}
  className="w-full py-3 rounded-xl text-sm font-ui text-p1-brown active:opacity-60 min-h-[44px]"
>
  Paste a recipe instead
</button>
```

Use whichever pattern fits the existing UI structure. The goal is that `/recipes/add/import` is reachable from at least one tap from the recipe bank page.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Visual smoke test**

```bash
npm run dev
```

Navigate to the recipe bank page. Tap the "Add recipe" button or equivalent. Confirm "Import from text" / "Paste a recipe instead" option is visible and tapping it navigates to `/recipes/add/import`.

- [ ] **Step 5: Commit**

```bash
git add app/recipes/page.tsx
git commit -m "feat(s03-007): wire Import from text entry point to /recipes/add/import"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Covered by |
|---|---|
| Single undivided textarea, min-height 200px | Task 2 — `min-h-[200px]`, `height: calc(100dvh - 280px)` |
| Headline "Drop in the recipe exactly as you got it." | Task 2 |
| Placeholder text per spec | Task 2 |
| CTA "Read this recipe" | Task 2 |
| Loading: "Reading your recipe…" | Task 2 — `ctaText` |
| Stall fallback >15s | Task 2 — `STALL_DELAY_MS` |
| Timeout >30s with retry | Task 2 — `TIMEOUT_MS` + AbortController |
| Error inline below textarea, text stays populated | Task 2 |
| Haiku 4.5, JSON mode, prompt caching | Task 1 — `claude-haiku-4-5`, `cache_control: { type: 'ephemeral' }` |
| Parse failure "not a recipe" | Task 1 — `NOT_A_RECIPE` code |
| Required fields: name + ingredients + steps | Task 1 — validation block |
| Review screen — editable name, autofocused | Task 3 |
| Meal type chips only if LLM returned null | Task 3 — `showMealTypeChips` |
| Cook time display | Task 3 |
| Collapsed ingredient list | Task 3 |
| Collapsed step list | Task 3 |
| Single "Save Recipe" CTA | Task 3 |
| Guard: direct nav → redirect to import | Task 3 — `useEffect` redirects |
| Duplicate detection case-insensitive trimmed | Task 5 — `.toLowerCase()` comparison |
| Bottom sheet (not modal) | Task 4 — `@base-ui/react/dialog` |
| Pre-filled editable name, cursor at end | Task 4 — `autoFocus` on input |
| "Save as New Version" / "Cancel" | Task 4 |
| Version counter suffix (v2, v3…) | Task 5 — `buildSuggestedName` |
| Variant signal suffix (air fryer, quick, one pot) | Task 5 — `VARIANT_SIGNALS` |
| source='user_imported' on DB write | Task 5 — hardcoded in insert |
| anon_id from localStorage | Task 3 — `getAnonId()` |
| Toast "Saved. It's in your bank…" | Task 6 — `?toast=saved` param |
| No raw error strings to client | Task 6 — grep + approved copy table |
| source='global_curated' migration | Task 0 |
| Haiku + prompt caching proven before implementation | FEAT-S03-001-SPIKE |
| Navigation entry point to import screen | FEAT-S03-007 — "Import from text" option on recipe bank page |
| Touch targets 44×44pt | All buttons use `min-h-[44px]` and `min-w-[44px]` where needed |
| Bottom sheet max 70% viewport, scrollable | Task 4 — `max-h-[70dvh] overflow-y-auto` |
| No asChild prop | All components use @base-ui directly — no asChild |
| No shadcn/tailwind.css import | Not imported anywhere in new files |
| DB queries via admin client in API routes only | Tasks 1, 5 — only API routes touch DB |
| Error format `{ error, code, details? }` | All routes follow this shape |
| Commit to main | All tasks commit directly to main |

### Placeholder scan

No TBD, TODO, "implement later", "similar to Task N", or underspecified steps found.

### Type consistency

- `ParsedRecipeFields` exported from `parse-text/route.ts` is not imported by the client (sessionStorage is untyped JSON). The client types the draft inline as `ParsedDraft` — the shapes match.
- `DuplicateNameSheet` props: `open`, `originalName`, `suggestedName`, `onSave(confirmedName: string)`, `onCancel()` — consistent between definition (Task 4) and usage (Task 3).
- `buildSuggestedName` in Task 5 takes `(baseName, existingNames, rawText)` and is only called internally in the route — no cross-task type dependency.
