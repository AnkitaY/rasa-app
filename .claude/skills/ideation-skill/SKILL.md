# Ideation Skill

Orchestrates Phase 1: brainstorm a design spec with the founder, run pm-agent + ux-agent evaluation loops, surface the approved spec.

**Invocation:** `/ideation-skill` — the founder provides a rough idea or problem statement.

## Step 1 — Generate spec

Invoke the `superpowers:brainstorming` skill interactively with the founder. Work together to produce a design doc covering:
- Customer and their problem (≤2 sentences)
- Solution phases with exit criteria (each must be measurable and binary)
- Scope table: explicit In / Out columns
- User-facing flows (named and described)
- Technical shape (data model, API surface, key components)
- 5-Whys: customer, problem, solution, usage, why-us

Save the resulting spec to: `docs/ideas/specs/YYYY-MM-DD-[feature]-design.md`
(Replace YYYY-MM-DD with today's date, [feature] with a 2-3 word kebab-case name.)

## Step 2 — pm-agent evaluation

Spawn a `pm-agent` subagent. Pass the design doc path and these exact instructions:

> "Read the design doc at [path]. Evaluate it against these criteria:
> 1. Each phase has a measurable, binary exit criterion
> 2. Customer problem is stated in ≤2 sentences
> 3. Scope table is explicit (In / Out columns)
> 4. No feature is undefinable as a user story
> 5. 5-Whys completeness: customer, problem, solution, usage, why-us
>
> Return either:
> - APPROVED
> - NEEDS_REVISION: [section] → [issue] → [required fix]  (one line per issue, no prose)"

## Step 3 — ux-agent evaluation

Spawn a `ux-agent` subagent. Pass the design doc path and these exact instructions:

> "Read the design doc at [path]. Also read docs/BRAND_GUIDE.md. Evaluate against these criteria:
> 1. Every user-facing flow is named and described
> 2. No interaction leaves the user without feedback
> 3. Copy and tone match Brand Guide principles
> 4. Mobile-first flows are addressed
>
> Return either:
> - APPROVED
> - NEEDS_REVISION: [flow/section] → [issue] → [required fix]  (one line per issue, no prose)"

## Step 4 — Revision loop

Track loop count starting at 0.

If either evaluator returned NEEDS_REVISION:
1. Increment loop count.
2. If loop count > 3: stop. Present the spec to the founder with a summary of all outstanding issues. Do not loop further.
3. Incorporate ALL feedback items into the design doc. Save the updated file to the same path.
4. Return to Step 2 (re-run both evaluators).

## Step 5 — Present to founder

When both evaluators return APPROVED:
- Show the founder:
  - Final spec path
  - Number of revision loops completed
  - A 3-bullet summary of the main changes made across iterations
  - Any open questions flagged by evaluators during review (even if they approved)
- Next step prompt: "Ready to move to sprint planning? Use `/sprint-planning-skill` with this path."
