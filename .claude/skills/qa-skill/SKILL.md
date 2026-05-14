# QA Skill

Orchestrates Phase 4: test-engineer writes Playwright E2E tests from acceptance criteria, routes failures, loops until clean.

**Invocation:** `/qa-skill` — the founder provides the feature name (or sprint name for a full sprint QA pass). Dev server must be running on `localhost:3000` before invoking.

## Step 1 — Generate and run tests

Spawn a `test-engineer` subagent. Provide:
- The feature name (or sprint name)
- The acceptance criteria from `ops/sprints/[current sprint plan].md` (pass the exact AC text)
- These instructions:

> "Write Playwright E2E tests derived directly from these acceptance criteria:
> [paste ACs here]
>
> Rules:
> - One test per AC line. Test name = AC text, normalized to snake_case.
> - Target: `localhost:3000` (dev server is running)
> - No hardcoded flows — every test must trace back to an AC
> - Run all tests. Report: PASS / FAIL per test, with failure detail.
>
> After local tests pass: run a Playwright smoke test of these 3 critical flows against `https://rasa-app-woad.vercel.app/`:
> 1. Plan generation (generate a meal plan from scratch)
> 2. Onboarding (complete onboarding for a new anon user)
> 3. Meal marking (mark a meal as cooked with a family verdict)
>
> Report Vercel smoke results separately."

If any Vercel smoke test fails: classify using the same Step 2 routing rules. Vercel-specific failures (env var missing in production, deployment artifact issue) are code bugs — route to backend-engineer.

## Step 2 — Route failures

For each failing test, classify and route:

**Code bug** (wrong behavior, crash, API error, data not persisting/loading correctly — rule: if the behavior is *absent or broken*, it's a code bug):
- Spawn `backend-engineer` or `frontend-engineer` subagent (API/DB failures → backend; render/interaction failures → frontend)
- Provide: failing test name, failure output, relevant source file paths
- Engineer fixes and returns
- Mark test for retest
- If the engineer returns without a fix (needs more context, cannot resolve): write to `ops/NEEDS_FOUNDER.md` as a product ambiguity entry and pause on this test.

**UX issue** (confusing flow, missing feedback state, bad copy, wrong interaction model — rule: if the behavior *exists but is confusing or unclear*, it's a UX issue):
- Spawn `ux-agent` subagent with: failing test name + description of observed behavior vs the AC
- ux-agent returns a specific, implementable fix (targeted change, not a redesign)
- Spawn `frontend-engineer` subagent to implement the fix
- Mark test for retest

**Product ambiguity** (requirement unclear, behavior is debatable, AC is underspecified):
- Write to `ops/NEEDS_FOUNDER.md`:
  ```
  ## [DATE] — QA: [feature name] / [test name]
  **Type:** product ambiguity
  **AC:** [exact AC text]
  **Observed:** [what the app currently does]
  **Question:** [specific question for founder]
  ```
- Pause on this test (do not retry). Continue with remaining tests.

## Step 3 — Retest loop

After all fixes are implemented: re-run only the failing tests (not the full suite).
Repeat Steps 2–3 until all tests pass or all open failures are escalated to founder.

## Step 4 — Summary

Write QA summary to `ops/DAILY_LOG.md`:

```
## QA: [feature/sprint name] — [DATE]
- Tests written: N
- Tests passing: N
- Escalated to founder: N
  - [list each escalated item]
- Vercel smoke: PASS / FAIL (list any failures)
```

Present the summary to the founder and ask for sign-off.
